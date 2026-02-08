import process from 'node:process';
import React, {type ReactNode} from 'react';
import {throttle, type DebouncedFunc} from 'es-toolkit/compat';
import ansiEscapes from 'ansi-escapes';
import isInCi from 'is-in-ci';
import autoBind from 'auto-bind';
import signalExit from 'signal-exit';
import patchConsole from 'patch-console';
import {LegacyRoot, ConcurrentRoot} from 'react-reconciler/constants.js';
import {type FiberRoot} from 'react-reconciler';
import Yoga from 'yoga-layout';
import wrapAnsi from 'wrap-ansi';
import terminalSize from 'terminal-size';
import reconciler from './reconciler.js';
import render from './renderer.js';
import * as dom from './dom.js';
import logUpdate, {type LogUpdate} from './log-update.js';
import instances from './instances.js';
import App from './components/App.js';
import {accessibilityContext as AccessibilityContext} from './components/AccessibilityContext.js';

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
	Enable React Concurrent Rendering mode.
	
	When enabled:
	- Suspense boundaries work correctly with async data
	- `useTransition` and `useDeferredValue` are fully functional
	- Updates can be interrupted for higher priority work

	Note: Concurrent mode changes the timing of renders. Some tests may need to use `act()` to properly await updates. The `concurrent` option only takes effect on the first render for a given stdout. If you need to change the rendering mode, call `unmount()` first.
	
	@default false
	@experimental
	*/
	concurrent?: boolean;
};

export default class Ink {
	/**
	Whether this instance is using concurrent rendering mode.
	*/
	readonly isConcurrent: boolean;

	private readonly options: Options;
	private readonly log: LogUpdate;
	private readonly throttledLog: LogUpdate | DebouncedFunc<LogUpdate>;
	private readonly isScreenReaderEnabled: boolean;

	// Ignore last render after unmounting a tree to prevent empty output before exit
	private isUnmounted: boolean;
	private lastOutput: string;
	private lastOutputToRender: string;
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
	// Store reference to throttled onRender for flushing
	private readonly throttledOnRender?: DebouncedFunc<() => void>;

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

		if (unthrottled) {
			this.rootNode.onRender = this.onRender;
			this.throttledOnRender = undefined;
		} else {
			const throttled = throttle(this.onRender, renderThrottleMs, {
				leading: true,
				trailing: true,
			});
			this.rootNode.onRender = throttled;
			this.throttledOnRender = throttled;
		}

		this.rootNode.onImmediateRender = this.onRender;
		this.log = logUpdate.create(options.stdout, {
			incremental: options.incrementalRendering,
		});
		this.throttledLog = unthrottled
			? this.log
			: (throttle(this.log, undefined, {
					leading: true,
					trailing: true,
				}) as unknown as DebouncedFunc<LogUpdate>);

		// Ignore last render after unmounting a tree to prevent empty output before exit
		this.isUnmounted = false;

		// Store concurrent mode setting
		this.isConcurrent = options.concurrent ?? false;

		// Store last output to only rerender when needed
		this.lastOutput = '';
		this.lastOutputToRender = '';
		this.lastOutputHeight = 0;
		this.lastTerminalWidth = this.getTerminalWidth();

		// This variable is used only in debug mode to store full static output
		// so that it's rerendered every time, not just new static parts, like in non-debug mode
		this.fullStaticOutput = '';

		// Use ConcurrentRoot for concurrent mode, LegacyRoot for legacy mode
		const rootTag = options.concurrent ? ConcurrentRoot : LegacyRoot;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.container = reconciler.createContainer(
			this.rootNode,
			rootTag,
			null,
			false,
			null,
			'id',
			() => {},
			() => {},
			() => {},
			() => {},
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
	}

	getTerminalWidth = () => {
		// The 'columns' property can be undefined or 0 when not using a TTY.
		// Use terminal-size as a fallback for piped processes, then default to 80.
		if (this.options.stdout.columns) {
			return this.options.stdout.columns;
		}

		const size = terminalSize();
		return size?.columns ?? 80;
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

			const terminalWidth = this.getTerminalWidth();

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

		// Detect fullscreen: output fills or exceeds terminal height.
		// Only apply when writing to a real TTY — piped output always gets trailing newlines.
		const isFullscreen =
			this.options.stdout.isTTY && outputHeight >= this.options.stdout.rows;
		const outputToRender = isFullscreen ? output : output + '\n';

		if (this.lastOutputHeight >= this.options.stdout.rows) {
			this.options.stdout.write(
				ansiEscapes.clearTerminal + this.fullStaticOutput + output,
			);
			this.lastOutput = output;
			this.lastOutputToRender = outputToRender;
			this.lastOutputHeight = outputHeight;
			this.log.sync(outputToRender);
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			this.log.clear();
			this.options.stdout.write(staticOutput);
			this.log(outputToRender);
		}

		if (!hasStaticOutput && output !== this.lastOutput) {
			this.throttledLog(outputToRender);
		}

		this.lastOutput = output;
		this.lastOutputToRender = outputToRender;
		this.lastOutputHeight = outputHeight;
	};

	render(node: ReactNode): void {
		const tree = (
			<AccessibilityContext.Provider
				value={{isScreenReaderEnabled: this.isScreenReaderEnabled}}
			>
				<App
					stdin={this.options.stdin}
					stdout={this.options.stdout}
					stderr={this.options.stderr}
					writeToStdout={this.writeToStdout}
					writeToStderr={this.writeToStderr}
					exitOnCtrlC={this.options.exitOnCtrlC}
					onExit={this.unmount}
				>
					{node}
				</App>
			</AccessibilityContext.Provider>
		);

		if (this.options.concurrent) {
			// Concurrent mode: use updateContainer (async scheduling)
			reconciler.updateContainer(tree, this.container, null, noop);
		} else {
			// Legacy mode: use updateContainerSync + flushSyncWork (sync)
			reconciler.updateContainerSync(tree, this.container, null, noop);
			reconciler.flushSyncWork();
		}
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
		this.log(this.lastOutputToRender);
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
		this.log(this.lastOutputToRender);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	unmount(error?: Error | number | null): void {
		if (this.isUnmounted) {
			return;
		}

		// Flush any pending throttled render to ensure the final frame is rendered
		if (this.throttledOnRender) {
			this.throttledOnRender.flush();
		}

		this.calculateLayout();
		this.onRender();
		this.unsubscribeExit();

		if (typeof this.restoreConsole === 'function') {
			this.restoreConsole();
		}

		if (typeof this.unsubscribeResize === 'function') {
			this.unsubscribeResize();
		}

		// Flush any pending throttled log writes
		const throttledLog = this.throttledLog as DebouncedFunc<LogUpdate>;
		if (typeof throttledLog.flush === 'function') {
			throttledLog.flush();
		}

		// CIs don't handle erasing ansi escapes well, so it's better to
		// only render last frame of non-static output
		if (isInCi) {
			this.options.stdout.write(this.lastOutput + '\n');
		} else if (!this.options.debug) {
			this.log.done();
		}

		this.isUnmounted = true;

		if (this.options.concurrent) {
			// Concurrent mode: use updateContainer (async scheduling)
			reconciler.updateContainer(null, this.container, null, noop);
		} else {
			// Legacy mode: use updateContainerSync + flushSyncWork (sync)
			reconciler.updateContainerSync(null, this.container, null, noop);
			reconciler.flushSyncWork();
		}

		instances.delete(this.options.stdout);

		// Ensure all queued writes have been processed before resolving the
		// exit promise. For real writable streams, queue an empty write as a
		// barrier — its callback fires only after all prior writes complete.
		// For non-stream objects (e.g. test spies), resolve on next tick.
		//
		// When called from signal-exit during process shutdown (error is a
		// number or null rather than undefined/Error), resolve synchronously
		// because the event loop is draining and async callbacks won't fire.
		const resolveOrReject = () => {
			if (error instanceof Error) {
				this.rejectExitPromise(error);
			} else {
				this.resolveExitPromise();
			}
		};

		const isProcessExiting = error !== undefined && !(error instanceof Error);

		if (isProcessExiting) {
			resolveOrReject();
		} else if (
			(this.options.stdout as any)._writableState !== undefined ||
			this.options.stdout.writableLength !== undefined
		) {
			this.options.stdout.write('', resolveOrReject);
		} else {
			setImmediate(resolveOrReject);
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
}
