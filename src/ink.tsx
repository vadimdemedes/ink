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
import {isDev, getWindowSize} from './utils.js';
import reconciler from './reconciler.js';
import render from './renderer.js';
import * as dom from './dom.js';
import logUpdate, {type LogUpdate, type CursorPosition} from './log-update.js';
import {bsu, esu, shouldSynchronize} from './write-synchronized.js';
import instances from './instances.js';
import App from './components/App.js';
import {accessibilityContext as AccessibilityContext} from './components/AccessibilityContext.js';
import {
	type KittyKeyboardOptions,
	type KittyFlagName,
	resolveFlags,
} from './kitty-keyboard.js';

const noop = () => {};

const yieldImmediate = async () =>
	new Promise<void>(resolve => {
		setImmediate(resolve);
	});

const kittyQueryEscapeByte = 0x1b;
const kittyQueryOpenBracketByte = 0x5b;
const kittyQueryQuestionMarkByte = 0x3f;
const kittyQueryLetterByte = 0x75;
const zeroByte = 0x30;
const nineByte = 0x39;

type KittyQueryResponseMatch =
	| {state: 'complete'; endIndex: number}
	| {state: 'partial'};

const isDigitByte = (byte: number): boolean =>
	byte >= zeroByte && byte <= nineByte;

const matchKittyQueryResponse = (
	buffer: number[],
	startIndex: number,
): KittyQueryResponseMatch | undefined => {
	if (
		buffer[startIndex] !== kittyQueryEscapeByte ||
		buffer[startIndex + 1] !== kittyQueryOpenBracketByte ||
		buffer[startIndex + 2] !== kittyQueryQuestionMarkByte
	) {
		return undefined;
	}

	let index = startIndex + 3;
	const digitsStartIndex = index;
	while (index < buffer.length && isDigitByte(buffer[index]!)) {
		index++;
	}

	if (index === digitsStartIndex) {
		return undefined;
	}

	if (index === buffer.length) {
		return {state: 'partial'};
	}

	if (buffer[index] === kittyQueryLetterByte) {
		return {state: 'complete', endIndex: index};
	}

	return undefined;
};

const hasCompleteKittyQueryResponse = (buffer: number[]): boolean => {
	for (let index = 0; index < buffer.length; index++) {
		const match = matchKittyQueryResponse(buffer, index);
		if (match?.state === 'complete') {
			return true;
		}
	}

	return false;
};

const stripKittyQueryResponsesAndTrailingPartial = (
	buffer: number[],
): number[] => {
	const keptBytes: number[] = [];
	let index = 0;
	while (index < buffer.length) {
		const match = matchKittyQueryResponse(buffer, index);
		if (match?.state === 'complete') {
			index = match.endIndex + 1;
			continue;
		}

		if (match?.state === 'partial') {
			break;
		}

		keptBytes.push(buffer[index]!);
		index++;
	}

	return keptBytes;
};

const shouldClearTerminalForFrame = ({
	isTty,
	viewportRows,
	previousOutputHeight,
	nextOutputHeight,
	isUnmounting,
}: {
	isTty: boolean;
	viewportRows: number;
	previousOutputHeight: number;
	nextOutputHeight: number;
	isUnmounting: boolean;
}): boolean => {
	if (!isTty) {
		return false;
	}

	const hadPreviousFrame = previousOutputHeight > 0;
	const wasFullscreen = previousOutputHeight >= viewportRows;
	const wasOverflowing = previousOutputHeight > viewportRows;
	const isOverflowing = nextOutputHeight > viewportRows;
	const isLeavingFullscreen = wasFullscreen && nextOutputHeight < viewportRows;
	const shouldClearOnUnmount = isUnmounting && wasFullscreen;

	return (
		// Overflowing frames still need full clear fallback.
		wasOverflowing ||
		(isOverflowing && hadPreviousFrame) ||
		// Clear when shrinking from fullscreen to non-fullscreen output.
		isLeavingFullscreen ||
		// Preserve legacy unmount behavior for fullscreen frames: final teardown
		// render should clear once to avoid leaving a scrolled viewport state.
		shouldClearOnUnmount
	);
};

const isErrorInput = (value: unknown): value is Error => {
	return (
		value instanceof Error ||
		Object.prototype.toString.call(value) === '[object Error]'
	);
};

type MaybeWritableStream = NodeJS.WriteStream & {
	writable?: boolean;
	writableEnded?: boolean;
	destroyed?: boolean;
	writableLength?: number;
	_writableState?: unknown;
};

const getWritableStreamState = (stdout: MaybeWritableStream) => {
	const canWriteToStdout =
		!stdout.destroyed && !stdout.writableEnded && (stdout.writable ?? true);
	const hasWritableState =
		stdout._writableState !== undefined || stdout.writableLength !== undefined;

	return {
		canWriteToStdout,
		hasWritableState,
	};
};

const settleThrottle = (
	throttled: unknown,
	canWriteToStdout: boolean,
): void => {
	if (
		!throttled ||
		typeof (throttled as {flush?: unknown}).flush !== 'function'
	) {
		return;
	}

	const throttledValue = throttled as {
		flush: () => void;
		cancel?: () => void;
	};

	if (canWriteToStdout) {
		throttledValue.flush();
	} else if (typeof throttledValue.cancel === 'function') {
		throttledValue.cancel();
	}
};

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
	waitUntilExit?: () => Promise<unknown>;
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
	kittyKeyboard?: KittyKeyboardOptions;
	/**
	Enable non-interactive output mode.
	@see {@link RenderOptions.nonInteractive}
	@default true if in CI or stdout.isTTY is falsy (when the property exists)
	*/
	nonInteractive?: boolean;
};

export default class Ink {
	/**
	Whether this instance is using concurrent rendering mode.
	*/
	readonly isConcurrent: boolean;

	private readonly options: Options;
	private readonly log: LogUpdate;
	private cursorPosition: CursorPosition | undefined;
	private readonly throttledLog:
		| LogUpdate
		| DebouncedFunc<(output: string) => void>;

	private readonly isScreenReaderEnabled: boolean;
	private readonly nonInteractive: boolean;

	// Ignore last render after unmounting a tree to prevent empty output before exit
	private isUnmounted: boolean;
	private isUnmounting: boolean;
	private lastOutput: string;
	private lastOutputToRender: string;
	private lastOutputHeight: number;
	private lastTerminalWidth: number;
	private readonly container: FiberRoot;
	private readonly rootNode: dom.DOMElement;
	// This variable is used only in debug mode to store full static output
	// so that it's rerendered every time, not just new static parts, like in non-debug mode
	private fullStaticOutput: string;
	private readonly exitPromise!: Promise<unknown>;
	private exitResult: unknown;
	private beforeExitHandler?: () => void;
	private restoreConsole?: () => void;
	private readonly unsubscribeResize?: () => void;
	private readonly throttledOnRender?: DebouncedFunc<() => void>;
	private hasPendingThrottledRender = false;
	private kittyProtocolEnabled = false;
	private cancelKittyDetection?: () => void;
	private nextRenderCommit?: {promise: Promise<void>; resolve: () => void};

	constructor(options: Options) {
		autoBind(this);

		this.options = options;
		this.rootNode = dom.createNode('ink-root');
		this.rootNode.onComputeLayout = this.calculateLayout;

		this.isScreenReaderEnabled =
			options.isScreenReaderEnabled ??
			process.env['INK_SCREEN_READER'] === 'true';

		// CI detection takes precedence: even a TTY stdout in CI defaults to non-interactive.
		// Using !isTTY (rather than an 'in' guard) correctly handles piped streams
		// where the property is absent (e.g. `node app.js | cat`).
		this.nonInteractive =
			options.nonInteractive ?? (isInCi || !options.stdout.isTTY);

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
			this.rootNode.onRender = () => {
				this.hasPendingThrottledRender = true;
				throttled();
			};

			this.throttledOnRender = throttled;
		}

		this.rootNode.onImmediateRender = this.onRender;
		this.log = logUpdate.create(options.stdout, {
			incremental: options.incrementalRendering,
		});
		this.cursorPosition = undefined;
		this.throttledLog = unthrottled
			? this.log
			: throttle(
					(output: string) => {
						const shouldWrite = this.log.willRender(output);
						const sync = this.shouldSync();
						if (sync && shouldWrite) {
							this.options.stdout.write(bsu);
						}

						this.log(output);

						if (sync && shouldWrite) {
							this.options.stdout.write(esu);
						}
					},
					undefined,
					{
						leading: true,
						trailing: true,
					},
				);

		// Ignore last render after unmounting a tree to prevent empty output before exit
		this.isUnmounted = false;
		this.isUnmounting = false;

		// Store concurrent mode setting
		this.isConcurrent = options.concurrent ?? false;

		// Store last output to only rerender when needed
		this.lastOutput = '';
		this.lastOutputToRender = '';
		this.lastOutputHeight = 0;
		this.lastTerminalWidth = getWindowSize(this.options.stdout).columns;

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

		if (isDev()) {
			// @ts-expect-error outdated types
			reconciler.injectIntoDevTools();
		}

		if (options.patchConsole) {
			this.patchConsole();
		}

		if (!this.nonInteractive) {
			options.stdout.on('resize', this.resized);

			this.unsubscribeResize = () => {
				options.stdout.off('resize', this.resized);
			};
		}

		this.initKittyKeyboard();

		this.exitPromise = new Promise((resolve, reject) => {
			this.resolveExitPromise = resolve;
			this.rejectExitPromise = reject;
		});
		// Prevent global unhandled-rejection crashes when app code exits with an
		// error but consumers never call waitUntilExit().
		// eslint-disable-next-line promise/prefer-await-to-then
		void this.exitPromise.catch(noop);
	}

	resized = () => {
		const currentWidth = getWindowSize(this.options.stdout).columns;

		if (currentWidth < this.lastTerminalWidth) {
			// We clear the screen when decreasing terminal width to prevent duplicate overlapping re-renders.
			this.log.clear();
			this.lastOutput = '';
			this.lastOutputToRender = '';
		}

		this.calculateLayout();
		this.onRender();

		this.lastTerminalWidth = currentWidth;
	};

	resolveExitPromise: (result?: unknown) => void = () => {};
	rejectExitPromise: (reason?: Error) => void = () => {};
	unsubscribeExit: () => void = () => {};

	handleAppExit = (errorOrResult?: unknown): void => {
		if (this.isUnmounted || this.isUnmounting) {
			return;
		}

		if (isErrorInput(errorOrResult)) {
			this.unmount(errorOrResult);
			return;
		}

		this.exitResult = errorOrResult;
		this.unmount();
	};

	setCursorPosition = (position: CursorPosition | undefined): void => {
		this.cursorPosition = position;
		this.log.setCursorPosition(position);
	};

	restoreLastOutput = (): void => {
		if (this.nonInteractive) {
			return;
		}

		// Clear() resets log-update's cursor state, so replay the latest cursor intent
		// before restoring output after external stdout/stderr writes.
		this.log.setCursorPosition(this.cursorPosition);
		this.log(this.lastOutputToRender || this.lastOutput + '\n');
	};

	calculateLayout = () => {
		const terminalWidth = getWindowSize(this.options.stdout).columns;

		this.rootNode.yogaNode!.setWidth(terminalWidth);

		this.rootNode.yogaNode!.calculateLayout(
			undefined,
			undefined,
			Yoga.DIRECTION_LTR,
		);
	};

	onRender: () => void = () => {
		this.hasPendingThrottledRender = false;

		if (this.isUnmounted) {
			return;
		}

		if (this.nextRenderCommit) {
			this.nextRenderCommit.resolve();
			this.nextRenderCommit = undefined;
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

			this.lastOutput = output;
			this.lastOutputToRender = output;
			this.lastOutputHeight = outputHeight;
			this.options.stdout.write(this.fullStaticOutput + output);
			return;
		}

		if (this.nonInteractive) {
			if (hasStaticOutput) {
				this.options.stdout.write(staticOutput);
			}

			this.lastOutput = output;
			this.lastOutputToRender = output + '\n';
			this.lastOutputHeight = outputHeight;
			return;
		}

		if (this.isScreenReaderEnabled) {
			const sync = this.shouldSync();
			if (sync) {
				this.options.stdout.write(bsu);
			}

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
				if (sync) {
					this.options.stdout.write(esu);
				}

				return;
			}

			const terminalWidth = getWindowSize(this.options.stdout).columns;

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
			this.lastOutputToRender = wrappedOutput;
			this.lastOutputHeight =
				wrappedOutput === '' ? 0 : wrappedOutput.split('\n').length;

			if (sync) {
				this.options.stdout.write(esu);
			}

			return;
		}

		if (hasStaticOutput) {
			this.fullStaticOutput += staticOutput;
		}

		this.renderInteractiveFrame(
			output,
			outputHeight,
			hasStaticOutput ? staticOutput : '',
		);
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
					exitOnCtrlC={this.options.exitOnCtrlC}
					nonInteractive={this.nonInteractive}
					writeToStdout={this.writeToStdout}
					writeToStderr={this.writeToStderr}
					setCursorPosition={this.setCursorPosition}
					onExit={this.handleAppExit}
					onWaitUntilRenderFlush={this.waitUntilRenderFlush}
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

		if (this.nonInteractive) {
			this.options.stdout.write(data);
			return;
		}

		const sync = this.shouldSync();
		if (sync) {
			this.options.stdout.write(bsu);
		}

		this.log.clear();
		this.options.stdout.write(data);
		this.restoreLastOutput();

		if (sync) {
			this.options.stdout.write(esu);
		}
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

		if (this.nonInteractive) {
			this.options.stderr.write(data);
			return;
		}

		const sync = this.shouldSync();
		if (sync) {
			this.options.stdout.write(bsu);
		}

		this.log.clear();
		this.options.stderr.write(data);
		this.restoreLastOutput();

		if (sync) {
			this.options.stdout.write(esu);
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	unmount(error?: Error | number | null): void {
		if (this.isUnmounted || this.isUnmounting) {
			return;
		}

		this.isUnmounting = true;

		if (this.beforeExitHandler) {
			process.off('beforeExit', this.beforeExitHandler);
			this.beforeExitHandler = undefined;
		}

		const stdout = this.options.stdout as MaybeWritableStream;
		const {canWriteToStdout, hasWritableState} = getWritableStreamState(stdout);

		// Clear any pending throttled render timer on unmount. When stdout is writable,
		// flush so the final frame is emitted; otherwise cancel to avoid delayed callbacks.
		settleThrottle(this.throttledOnRender, canWriteToStdout);

		if (canWriteToStdout) {
			// If throttling is enabled and there is already a pending render, flushing above
			// is sufficient. Also avoid calling onRender() again when static output already
			// exists, as that can duplicate <Static> children output on exit (see issue #397).
			const shouldRenderFinalFrame =
				!this.throttledOnRender ||
				(!this.hasPendingThrottledRender && this.fullStaticOutput === '');

			if (shouldRenderFinalFrame) {
				this.calculateLayout();
				this.onRender();
			}
		}

		// Mark as unmounted after the final render but before stdout writes
		// that could re-enter exit() via synchronous write callbacks.
		this.isUnmounted = true;

		this.unsubscribeExit();

		if (typeof this.restoreConsole === 'function') {
			this.restoreConsole();
		}

		if (typeof this.unsubscribeResize === 'function') {
			this.unsubscribeResize();
		}

		// Cancel any in-progress auto-detection before checking protocol state
		if (this.cancelKittyDetection) {
			this.cancelKittyDetection();
		}

		// Flush any pending throttled log writes if possible, otherwise cancel to
		// prevent delayed callbacks from writing to a closed stream.
		settleThrottle(this.throttledLog, canWriteToStdout);

		if (canWriteToStdout) {
			if (this.kittyProtocolEnabled) {
				try {
					this.options.stdout.write('\u001B[<u');
				} catch {
					// Best-effort: stdout may already be destroyed during shutdown
				}
			}

			// Non-interactive environments don't handle erasing ansi escapes well.
			// In debug mode, each render already writes to stdout, so only a trailing
			// newline is needed. In non-debug mode, write the last frame now (it was
			// deferred during rendering).
			if (this.nonInteractive) {
				this.options.stdout.write(
					this.options.debug ? '\n' : this.lastOutput + '\n',
				);
			} else if (!this.options.debug) {
				this.log.done();
			}
		}

		this.kittyProtocolEnabled = false;

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
		const {exitResult} = this;

		const resolveOrReject = () => {
			if (isErrorInput(error)) {
				this.rejectExitPromise(error);
			} else {
				this.resolveExitPromise(exitResult);
			}
		};

		const isProcessExiting = error !== undefined && !isErrorInput(error);

		if (isProcessExiting) {
			resolveOrReject();
		} else if (canWriteToStdout && hasWritableState) {
			this.options.stdout.write('', resolveOrReject);
		} else {
			setImmediate(resolveOrReject);
		}
	}

	async waitUntilExit(): Promise<unknown> {
		if (!this.beforeExitHandler) {
			this.beforeExitHandler = () => {
				this.unmount();
			};

			process.once('beforeExit', this.beforeExitHandler);
		}

		return this.exitPromise;
	}

	async waitUntilRenderFlush(): Promise<void> {
		if (this.isUnmounted || this.isUnmounting) {
			await this.awaitExit();
			return;
		}

		// Yield to the macrotask queue so that React's scheduler has a chance to
		// fire passive effects and process any work they enqueued.
		await yieldImmediate();

		if (this.isUnmounted || this.isUnmounting) {
			await this.awaitExit();
			return;
		}

		// In concurrent mode, React's scheduler may still be mid-render after
		// the yield. Wait for the next render commit instead of polling.
		if (this.isConcurrent && this.hasPendingConcurrentWork()) {
			await Promise.race([this.awaitNextRender(), this.awaitExit()]);

			if (this.isUnmounted || this.isUnmounting) {
				this.nextRenderCommit = undefined;
				await this.awaitExit();
				return;
			}
		}

		reconciler.flushSyncWork();

		const stdout = this.options.stdout as MaybeWritableStream;
		const {canWriteToStdout, hasWritableState} = getWritableStreamState(stdout);

		// Flush pending throttled render/log timers so their output is included in this wait.
		settleThrottle(this.throttledOnRender, canWriteToStdout);
		settleThrottle(this.throttledLog, canWriteToStdout);

		if (canWriteToStdout && hasWritableState) {
			await new Promise<void>(resolve => {
				this.options.stdout.write('', () => {
					resolve();
				});
			});
			return;
		}

		await yieldImmediate();
	}

	clear(): void {
		if (!this.nonInteractive && !this.options.debug) {
			this.log.clear();
			// Sync lastOutput so that unmount's final onRender
			// sees it as unchanged and log-update skips it
			this.log.sync(this.lastOutputToRender || this.lastOutput + '\n');
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

	private shouldSync(): boolean {
		return shouldSynchronize(this.options.stdout, this.nonInteractive);
	}

	// Waits for the exit promise to settle, suppressing any rejection.
	// Errors are surfaced via waitUntilExit() instead.
	private async awaitExit(): Promise<void> {
		try {
			await this.exitPromise;
		} catch {}
	}

	private hasPendingConcurrentWork(): boolean {
		const concurrentContainer = this.container as {
			pendingLanes?: number;
			callbackNode?: unknown;
		};
		return (
			(concurrentContainer.pendingLanes ?? 0) !== 0 &&
			concurrentContainer.callbackNode !== undefined &&
			concurrentContainer.callbackNode !== null
		);
	}

	private async awaitNextRender(): Promise<void> {
		if (!this.nextRenderCommit) {
			let resolveRender!: () => void;
			const promise = new Promise<void>(resolve => {
				resolveRender = resolve;
			});
			this.nextRenderCommit = {promise, resolve: resolveRender};
		}

		return this.nextRenderCommit.promise;
	}

	private renderInteractiveFrame(
		output: string,
		outputHeight: number,
		staticOutput: string,
	): void {
		const hasStaticOutput = staticOutput !== '';
		const isTty = this.options.stdout.isTTY;

		// Detect fullscreen: output fills or exceeds terminal height.
		// Only apply when writing to a real TTY — piped output always gets trailing newlines.
		const viewportRows = isTty ? getWindowSize(this.options.stdout).rows : 24;
		const isFullscreen = isTty && outputHeight >= viewportRows;
		const outputToRender = isFullscreen ? output : output + '\n';

		const shouldClearTerminal = shouldClearTerminalForFrame({
			isTty,
			viewportRows,
			previousOutputHeight: this.lastOutputHeight,
			nextOutputHeight: outputHeight,
			isUnmounting: this.isUnmounting,
		});

		if (shouldClearTerminal) {
			const sync = this.shouldSync();
			if (sync) {
				this.options.stdout.write(bsu);
			}

			this.options.stdout.write(
				ansiEscapes.clearTerminal + this.fullStaticOutput + output,
			);
			this.lastOutput = output;
			this.lastOutputToRender = outputToRender;
			this.lastOutputHeight = outputHeight;
			this.log.sync(outputToRender);

			if (sync) {
				this.options.stdout.write(esu);
			}

			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			const sync = this.shouldSync();
			if (sync) {
				this.options.stdout.write(bsu);
			}

			this.log.clear();
			this.options.stdout.write(staticOutput);
			this.log(outputToRender);

			if (sync) {
				this.options.stdout.write(esu);
			}
		} else if (output !== this.lastOutput || this.log.isCursorDirty()) {
			// ThrottledLog manages its own bsu/esu at actual write time
			this.throttledLog(outputToRender);
		}

		this.lastOutput = output;
		this.lastOutputToRender = outputToRender;
		this.lastOutputHeight = outputHeight;
	}

	private initKittyKeyboard(): void {
		// Protocol is opt-in: if kittyKeyboard is not specified, do nothing
		if (!this.options.kittyKeyboard) {
			return;
		}

		const opts = this.options.kittyKeyboard;
		const mode = opts.mode ?? 'auto';

		if (
			mode === 'disabled' ||
			this.nonInteractive ||
			!this.options.stdin.isTTY ||
			!this.options.stdout.isTTY
		) {
			return;
		}

		const flags: KittyFlagName[] = opts.flags ?? ['disambiguateEscapeCodes'];

		if (mode === 'enabled') {
			this.enableKittyProtocol(flags);
			return;
		}

		// Auto mode: use heuristic precheck, then confirm with protocol query
		const term = process.env['TERM'] ?? '';
		const termProgram = process.env['TERM_PROGRAM'] ?? '';

		const isKnownSupportingTerminal =
			'KITTY_WINDOW_ID' in process.env ||
			term === 'xterm-kitty' ||
			termProgram === 'WezTerm' ||
			termProgram === 'ghostty';

		if (isKnownSupportingTerminal) {
			this.confirmKittySupport(flags);
		}
	}

	private confirmKittySupport(flags: KittyFlagName[]): void {
		const {stdin, stdout} = this.options;

		let responseBuffer: number[] = [];

		const cleanup = (): void => {
			this.cancelKittyDetection = undefined;
			clearTimeout(timer);
			stdin.removeListener('data', onData);

			// Re-emit any buffered data that wasn't the protocol response,
			// so it isn't lost from Ink's normal input pipeline.
			// Clear responseBuffer afterwards to make cleanup idempotent.
			const remaining =
				stripKittyQueryResponsesAndTrailingPartial(responseBuffer);
			responseBuffer = [];
			if (remaining.length > 0) {
				stdin.unshift(Buffer.from(remaining));
			}
		};

		const onData = (data: Uint8Array | string): void => {
			const chunk = typeof data === 'string' ? Buffer.from(data) : data;
			for (const byte of chunk) {
				responseBuffer.push(byte);
			}

			if (hasCompleteKittyQueryResponse(responseBuffer)) {
				cleanup();
				if (!this.isUnmounted) {
					this.enableKittyProtocol(flags);
				}
			}
		};

		// Attach listener before writing the query so that synchronous
		// or immediate responses are not missed.
		stdin.on('data', onData);
		const timer = setTimeout(cleanup, 200);
		this.cancelKittyDetection = cleanup;

		stdout.write('\u001B[?u');
	}

	private enableKittyProtocol(flags: KittyFlagName[]): void {
		this.options.stdout.write(`\u001B[>${resolveFlags(flags)}u`);
		this.kittyProtocolEnabled = true;
	}
}
