import process from 'node:process';
import React, {type ReactNode} from 'react';
import {throttle} from 'es-toolkit/compat';
import ansiEscapes from 'ansi-escapes';
import isInCi from 'is-in-ci';
import autoBind from 'auto-bind';
import signalExit from 'signal-exit';
import patchConsole from 'patch-console';
import {LegacyRoot} from 'react-reconciler/constants.js';
import {type FiberRoot} from 'react-reconciler';
import Yoga from 'yoga-layout';
import wrapAnsi from 'wrap-ansi';
import reconciler from './reconciler.js';
import render from './renderer.js';
import * as dom from './dom.js';
import logUpdate, {type LogUpdate} from './log-update.js';
import instances from './instances.js';
import App from './components/App.js';
import {accessibilityContext as AccessibilityContext} from './components/AccessibilityContext.js';
import {kittyQuery, kittyEnable, kittyDisable} from './kitty-keyboard.js';

const noop = () => {};

/**
Performance metrics for a render operation.
*/
export type RenderMetrics = {
	/**
	Time spent rendering in milliseconds.
	*/
	renderTime: number;
};

export type Options = {
	stdout: NodeJS.WriteStream;
	stdin: NodeJS.ReadStream;
	stderr: NodeJS.WriteStream;
	debug: boolean;
	exitOnCtrlC: boolean;
	patchConsole: boolean;
	onRender?: (metrics: RenderMetrics) => void;
	isScreenReaderEnabled?: boolean;
	waitUntilExit?: () => Promise<void>;
	maxFps?: number;
	incrementalRendering?: boolean;
	/**
	Disable Kitty keyboard protocol detection and usage.
	When true, Ink will not attempt to detect or enable the Kitty protocol.
	@default false
	*/
	disableKittyProtocol?: boolean;
};

// Timeout for Kitty keyboard protocol detection (in milliseconds)
const kittyDetectionTimeout = 200;

export default class Ink {
	private readonly options: Options;
	private readonly log: LogUpdate;
	private readonly throttledLog: LogUpdate;
	private readonly isScreenReaderEnabled: boolean;

	// Ignore last render after unmounting a tree to prevent empty output before exit
	private isUnmounted: boolean;
	private lastOutput: string;
	private lastOutputHeight: number;
	private lastTerminalWidth: number;
	private readonly container: FiberRoot;
	private readonly rootNode: dom.DOMElement;
	// This variable is used only in debug mode to store full static output
	// so that it's rerendered every time, not just new static parts, like in non-debug mode
	private fullStaticOutput: string;
	private exitPromise?: Promise<void>;
	private restoreConsole?: () => void;
	private readonly unsubscribeResize?: () => void;
	// Kitty keyboard protocol support
	private isKittyProtocolSupported = false;
	private isKittyProtocolEnabled = false;

	constructor(options: Options) {
		autoBind(this);

		this.options = options;
		this.rootNode = dom.createNode('ink-root');
		this.rootNode.onComputeLayout = this.calculateLayout;

		this.isScreenReaderEnabled =
			options.isScreenReaderEnabled ??
			process.env['INK_SCREEN_READER'] === 'true';

		const unthrottled = options.debug || this.isScreenReaderEnabled;
		const maxFps = options.maxFps ?? 30;
		const renderThrottleMs =
			maxFps > 0 ? Math.max(1, Math.ceil(1000 / maxFps)) : 0;

		this.rootNode.onRender = unthrottled
			? this.onRender
			: throttle(this.onRender, renderThrottleMs, {
					leading: true,
					trailing: true,
				});

		this.rootNode.onImmediateRender = this.onRender;
		this.log = logUpdate.create(options.stdout, {
			incremental: options.incrementalRendering,
		});
		this.throttledLog = unthrottled
			? this.log
			: (throttle(this.log, undefined, {
					leading: true,
					trailing: true,
				}) as unknown as LogUpdate);

		// Ignore last render after unmounting a tree to prevent empty output before exit
		this.isUnmounted = false;

		// Store last output to only rerender when needed
		this.lastOutput = '';
		this.lastOutputHeight = 0;
		this.lastTerminalWidth = this.getTerminalWidth();

		// This variable is used only in debug mode to store full static output
		// so that it's rerendered every time, not just new static parts, like in non-debug mode
		this.fullStaticOutput = '';

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.container = reconciler.createContainer(
			this.rootNode,
			LegacyRoot,
			null,
			false,
			null,
			'id',
			() => {},
			() => {},
			() => {},
			() => {},
			null,
		);

		// Unmount when process exits
		this.unsubscribeExit = signalExit(this.unmount, {alwaysLast: false});

		if (process.env['DEV'] === 'true') {
			reconciler.injectIntoDevTools({
				bundleType: 0,
				// Reporting React DOM's version, not Ink's
				// See https://github.com/facebook/react/issues/16666#issuecomment-532639905
				version: '16.13.1',
				rendererPackageName: 'ink',
			});
		}

		if (options.patchConsole) {
			this.patchConsole();
		}

		if (!isInCi) {
			options.stdout.on('resize', this.resized);

			this.unsubscribeResize = () => {
				options.stdout.off('resize', this.resized);
			};
		}

		// Start Kitty protocol detection asynchronously (non-blocking)
		// Detection runs in background and enables protocol if supported
		// Skip in CI/test environments as detection can interfere with test input handling
		const isTestEnvironment =
			isInCi || process.env['GITHUB_ACTIONS'] !== undefined;
		if (
			!options.disableKittyProtocol &&
			options.stdin.isTTY &&
			!isTestEnvironment
		) {
			void this.detectKittyProtocol();
		}
	}

	getTerminalWidth = () => {
		// The 'columns' property can be undefined or 0 when not using a TTY.
		// In that case we fall back to 80.
		return this.options.stdout.columns || 80;
	};

	resized = () => {
		const currentWidth = this.getTerminalWidth();

		if (currentWidth < this.lastTerminalWidth) {
			// We clear the screen when decreasing terminal width to prevent duplicate overlapping re-renders.
			this.log.clear();
			this.lastOutput = '';
		}

		this.calculateLayout();
		this.onRender();

		this.lastTerminalWidth = currentWidth;
	};

	resolveExitPromise: () => void = () => {};
	rejectExitPromise: (reason?: Error) => void = () => {};
	unsubscribeExit: () => void = () => {};

	calculateLayout = () => {
		const terminalWidth = this.getTerminalWidth();

		this.rootNode.yogaNode!.setWidth(terminalWidth);

		this.rootNode.yogaNode!.calculateLayout(
			undefined,
			undefined,
			Yoga.DIRECTION_LTR,
		);
	};

	onRender: () => void = () => {
		if (this.isUnmounted) {
			return;
		}

		const startTime = performance.now();
		const {output, outputHeight, staticOutput} = render(
			this.rootNode,
			this.isScreenReaderEnabled,
		);

		this.options.onRender?.({renderTime: performance.now() - startTime});

		// If <Static> output isn't empty, it means new children have been added to it
		const hasStaticOutput = staticOutput && staticOutput !== '\n';

		if (this.options.debug) {
			if (hasStaticOutput) {
				this.fullStaticOutput += staticOutput;
			}

			this.options.stdout.write(this.fullStaticOutput + output);
			return;
		}

		if (isInCi) {
			if (hasStaticOutput) {
				this.options.stdout.write(staticOutput);
			}

			this.lastOutput = output;
			this.lastOutputHeight = outputHeight;
			return;
		}

		if (this.isScreenReaderEnabled) {
			if (hasStaticOutput) {
				// We need to erase the main output before writing new static output
				const erase =
					this.lastOutputHeight > 0
						? ansiEscapes.eraseLines(this.lastOutputHeight)
						: '';
				this.options.stdout.write(erase + staticOutput);
				// After erasing, the last output is gone, so we should reset its height
				this.lastOutputHeight = 0;
			}

			if (output === this.lastOutput && !hasStaticOutput) {
				return;
			}

			const terminalWidth = this.options.stdout.columns || 80;

			const wrappedOutput = wrapAnsi(output, terminalWidth, {
				trim: false,
				hard: true,
			});

			// If we haven't erased yet, do it now.
			if (hasStaticOutput) {
				this.options.stdout.write(wrappedOutput);
			} else {
				const erase =
					this.lastOutputHeight > 0
						? ansiEscapes.eraseLines(this.lastOutputHeight)
						: '';
				this.options.stdout.write(erase + wrappedOutput);
			}

			this.lastOutput = output;
			this.lastOutputHeight =
				wrappedOutput === '' ? 0 : wrappedOutput.split('\n').length;
			return;
		}

		if (hasStaticOutput) {
			this.fullStaticOutput += staticOutput;
		}

		if (this.lastOutputHeight >= this.options.stdout.rows) {
			this.options.stdout.write(
				ansiEscapes.clearTerminal + this.fullStaticOutput + output,
			);
			this.lastOutput = output;
			this.lastOutputHeight = outputHeight;
			this.log.sync(output);
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			this.log.clear();
			this.options.stdout.write(staticOutput);
			this.log(output);
		}

		if (!hasStaticOutput && output !== this.lastOutput) {
			this.throttledLog(output);
		}

		this.lastOutput = output;
		this.lastOutputHeight = outputHeight;
	};

	render(node: ReactNode): void {
		const tree = (
			<AccessibilityContext.Provider
				value={{isScreenReaderEnabled: this.isScreenReaderEnabled}}
			>
				<App
					exitOnCtrlC={this.options.exitOnCtrlC}
					isKittyProtocolSupported={this.isKittyProtocolSupported}
					stderr={this.options.stderr}
					stdin={this.options.stdin}
					stdout={this.options.stdout}
					writeToStderr={this.writeToStderr}
					writeToStdout={this.writeToStdout}
					onExit={this.unmount}
				>
					{node}
				</App>
			</AccessibilityContext.Provider>
		);

		// @ts-expect-error the types for `react-reconciler` are not up to date with the library.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		reconciler.updateContainerSync(tree, this.container, null, noop);
		// @ts-expect-error the types for `react-reconciler` are not up to date with the library.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		reconciler.flushSyncWork();
	}

	writeToStdout(data: string): void {
		if (this.isUnmounted) {
			return;
		}

		if (this.options.debug) {
			this.options.stdout.write(data + this.fullStaticOutput + this.lastOutput);
			return;
		}

		if (isInCi) {
			this.options.stdout.write(data);
			return;
		}

		this.log.clear();
		this.options.stdout.write(data);
		this.log(this.lastOutput);
	}

	writeToStderr(data: string): void {
		if (this.isUnmounted) {
			return;
		}

		if (this.options.debug) {
			this.options.stderr.write(data);
			this.options.stdout.write(this.fullStaticOutput + this.lastOutput);
			return;
		}

		if (isInCi) {
			this.options.stderr.write(data);
			return;
		}

		this.log.clear();
		this.options.stderr.write(data);
		this.log(this.lastOutput);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	unmount(error?: Error | number | null): void {
		if (this.isUnmounted) {
			return;
		}

		this.calculateLayout();
		this.onRender();
		this.unsubscribeExit();

		// Disable Kitty protocol to restore terminal to original mode
		this.disableKittyProtocol();

		if (typeof this.restoreConsole === 'function') {
			this.restoreConsole();
		}

		if (typeof this.unsubscribeResize === 'function') {
			this.unsubscribeResize();
		}

		// CIs don't handle erasing ansi escapes well, so it's better to
		// only render last frame of non-static output
		if (isInCi) {
			this.options.stdout.write(this.lastOutput + '\n');
		} else if (!this.options.debug) {
			this.log.done();
		}

		this.isUnmounted = true;

		// @ts-expect-error the types for `react-reconciler` are not up to date with the library.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		reconciler.updateContainerSync(null, this.container, null, noop);
		// @ts-expect-error the types for `react-reconciler` are not up to date with the library.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		reconciler.flushSyncWork();
		instances.delete(this.options.stdout);

		if (error instanceof Error) {
			this.rejectExitPromise(error);
		} else {
			this.resolveExitPromise();
		}
	}

	async waitUntilExit(): Promise<void> {
		this.exitPromise ||= new Promise((resolve, reject) => {
			this.resolveExitPromise = resolve;
			this.rejectExitPromise = reject;
		});

		return this.exitPromise;
	}

	clear(): void {
		if (!isInCi && !this.options.debug) {
			this.log.clear();
		}
	}

	patchConsole(): void {
		if (this.options.debug) {
			return;
		}

		this.restoreConsole = patchConsole((stream, data) => {
			if (stream === 'stdout') {
				this.writeToStdout(data);
			}

			if (stream === 'stderr') {
				const isReactMessage = data.startsWith('The above error occurred');

				if (!isReactMessage) {
					this.writeToStderr(data);
				}
			}
		});
	}

	/**
	 * Detect if the terminal supports the Kitty keyboard protocol.
	 * This sends a query sequence and waits for a response with a timeout.
	 * If supported, enables the protocol.
	 */
	async detectKittyProtocol(): Promise<void> {
		const {stdin, stdout} = this.options;

		// Skip detection if disabled, stdin doesn't support raw mode, or already unmounted
		if (this.options.disableKittyProtocol === true) {
			return;
		}

		if (!stdin.isTTY || this.isUnmounted) {
			return;
		}

		try {
			const isSupported = await new Promise<boolean>(resolve => {
				let resolved = false;

				// Set up timeout
				const timeout = setTimeout(() => {
					if (!resolved) {
						resolved = true;
						stdin.removeListener('data', onData);
						resolve(false);
					}
				}, kittyDetectionTimeout);

				// Listen for response
				// The response format is: CSI ? flags u (e.g., \u001B[?1u)
				// eslint-disable-next-line no-control-regex
				const kittyResponseRegex = /\u001B\[\?\d+u/;

				const onData = (data: Uint8Array | string): void => {
					const str =
						typeof data === 'string' ? data : new TextDecoder().decode(data);

					if (kittyResponseRegex.test(str) && !resolved) {
						resolved = true;
						clearTimeout(timeout);
						stdin.removeListener('data', onData);
						resolve(true);
					}
				};

				stdin.on('data', onData);

				// Send the query sequence
				stdout.write(kittyQuery);
			});

			if (isSupported && !this.isUnmounted) {
				this.isKittyProtocolSupported = true;
				this.enableKittyProtocol();
			}
		} catch {
			// Detection failed, leave protocol disabled
		}
	}

	/**
	 * Enable the Kitty keyboard protocol by sending the opt-in sequence.
	 */
	enableKittyProtocol(): void {
		if (this.isKittyProtocolEnabled || this.isUnmounted) {
			return;
		}

		this.options.stdout.write(kittyEnable);
		this.isKittyProtocolEnabled = true;
	}

	/**
	 * Disable the Kitty keyboard protocol by sending the opt-out sequence.
	 * This restores the terminal to its original mode.
	 */
	disableKittyProtocol(): void {
		if (!this.isKittyProtocolEnabled) {
			return;
		}

		this.options.stdout.write(kittyDisable);
		this.isKittyProtocolEnabled = false;
	}
}
