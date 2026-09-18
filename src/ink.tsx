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
import {getWindowSize} from './utils.js';
import reconciler from './reconciler.js';
import render from './renderer.js';
import * as dom from './dom.js';
import {
	cursorPositionChanged,
	hideCursorEscape,
	showCursorEscape,
} from './cursor-helpers.js';
import logUpdate, {type LogUpdate, type CursorPosition} from './log-update.js';
import {bsu, esu, shouldSynchronize} from './write-synchronized.js';
import instances from './instances.js';
import App from './components/App.js';
import RootNodeContext from './components/RootNodeContext.js';
import {type TerminalSuspension} from './components/AppContext.js';
import {accessibilityContext as AccessibilityContext} from './components/AccessibilityContext.js';
import {
	type KittyKeyboardOptions,
	type KittyFlagName,
	resolveFlags,
} from './kitty-keyboard.js';
import {isTty, type OutputStream} from './stream.js';

type CursorMode = 'hook' | 'component';

const noop = () => {};

const yieldImmediate = async () =>
	new Promise<void>(resolve => {
		setImmediate(resolve);
	});

// Windows consoles scroll the buffer when the bottom-right cell is written,
// unlike xterm-like terminals which defer the wrap. That extra scroll
// desynchronizes the incremental erase used for frames that exactly fill the
// viewport, leaving stale copies of previous frames behind (#969). Keep the
// pre-7.0 behavior of fully clearing between fullscreen frames there.
const isWindowsConsole = process.platform === 'win32';

// Full-clear path (see `shouldClearTerminalForFrame`). It must clear only
// what is visible: `ansiEscapes.clearTerminal` emits CSI 3J, which erases the
// terminal's scrollback, and both it and `ansiEscapes.clearViewport` emit
// CSI 2J, which VS Code and Windows Terminal handle by pushing the viewport
// into scrollback first (#935). Exported so tests assert against the real
// sequence rather than a copy.
export const homeAndEraseDown =
	ansiEscapes.cursorTo(0, 0) + ansiEscapes.eraseDown;

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
	const isFullscreen = nextOutputHeight >= viewportRows;
	const isLeavingFullscreen = wasFullscreen && nextOutputHeight < viewportRows;
	const shouldClearOnUnmount = isUnmounting && wasFullscreen;

	if (isWindowsConsole && (wasFullscreen || isFullscreen)) {
		return true;
	}

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

const getWritableStreamState = (stdout: OutputStream) => {
	const canWriteToStdout =
		!stdout.destroyed && !stdout.writableEnded && (stdout.writable ?? true);

	return {
		canWriteToStdout,
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
	stdout: OutputStream;
	stdin: NodeJS.ReadableStream;
	stderr: OutputStream;
	debug: boolean;
	exitOnCtrlC: boolean;
	patchConsole: boolean;
	onRender?: (metrics: RenderMetrics) => void;
	onCursorUpdated?: (cursor: CursorPosition | undefined) => void;
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

	Note: Concurrent mode changes the timing of renders. Some tests may need to use `act()` to properly await updates. Reusing the same stdout across multiple `render()` calls without unmounting is unsupported. Call `unmount()` first if you need to change the rendering mode or create a fresh instance.

	@default false
	@experimental
	*/
	concurrent?: boolean;
	kittyKeyboard?: KittyKeyboardOptions;

	/**
	Override automatic interactive mode detection.

	By default, Ink detects whether the environment is interactive based on CI detection (via [`is-in-ci`](https://github.com/sindresorhus/is-in-ci)) and `stdout.isTTY`. Most users should not need to set this.

	When non-interactive, Ink disables ANSI erase sequences, cursor manipulation, synchronized output, resize handling, and kitty keyboard auto-detection, writing only the final frame at unmount.

	Set to `false` to force non-interactive mode or `true` to force interactive mode when the automatic detection doesn't suit your use case.

	Note: Reusing the same stdout across multiple `render()` calls without unmounting is unsupported. Call `unmount()` first if you need to change this option or create a fresh instance.

	@default true (false if in CI or `stdout.isTTY` is falsy)

	@see {@link RenderOptions.interactive}
	*/
	interactive?: boolean;

	/**
	Render the app in the terminal's alternate screen buffer. When enabled, the app renders on a separate screen, and the original terminal content is restored when the app exits. This is the same mechanism used by programs like vim, htop, and less.

	Note: The terminal's scrollback buffer is not available while in the alternate screen. This is standard terminal behavior; programs like vim use the alternate screen specifically to avoid polluting the user's scrollback history.

	Note: Ink intentionally treats alternate-screen teardown output as disposable. It does not preserve or replay teardown-time frames, hook writes, or `console.*` output after restoring the primary screen.

	Only works in interactive mode. Ignored when `interactive` is `false` or in a non-interactive environment (CI, piped stdout).

	Note: Reusing the same stdout across multiple `render()` calls without unmounting is unsupported. Call `unmount()` first if you need to change this option or create a fresh instance.

	@default false

	@see {@link RenderOptions.alternateScreen}
	*/
	alternateScreen?: boolean;
};

export default class Ink {
	/**
	Whether this instance is using concurrent rendering mode.
	*/
	readonly isConcurrent: boolean;

	private readonly options: Options;
	private readonly log: LogUpdate;
	private cursorMode: CursorMode | undefined;
	private cursorPosition: CursorPosition | undefined;
	private readonly throttledLog:
		LogUpdate | DebouncedFunc<(output: string) => void>;

	private readonly isScreenReaderEnabled: boolean;
	private readonly interactive: boolean;
	private readonly renderThrottleMs: number;
	private alternateScreen: boolean;

	// Ignore last render after unmounting a tree to prevent empty output before exit
	private isUnmounted: boolean;
	private isUnmounting: boolean;
	private lastOutput: string;
	private lastOutputToRender: string;
	private lastOutputHeight: number;
	private lastTerminalWidth: number;
	private lastTerminalHeight: number;
	private readonly container: FiberRoot;
	private readonly rootNode: dom.DOMElement;
	// Accumulated <Static> output. Only kept in debug mode, where every frame rewrites it, and on the alternate screen, where it has to be replayed on full clears because there is no scrollback to keep it in.
	private fullStaticOutput: string;
	// Whether any <Static> output has been written. The final unmount render is skipped once it has, since rendering again would duplicate <Static> children on exit (#397).
	private hasRenderedStaticOutput: boolean;
	private readonly exitPromise!: Promise<unknown>;
	private exitResult: unknown;
	private beforeExitHandler?: () => void;
	private restoreConsole?: () => void;
	private readonly unsubscribeResize?: () => void;
	private readonly throttledOnRender?: DebouncedFunc<() => void>;
	private hasPendingThrottledRender = false;
	private kittyProtocolEnabled = false;
	private kittyFlags: KittyFlagName[] | undefined;
	private finishKittyDetection?: (supported: boolean) => void;
	private nextRenderCommit?: {promise: Promise<void>; resolve: () => void};
	// Set while suspendTerminal() has handed the terminal to a child process.
	private isSuspended = false;
	// Input pause/resume hooks registered by the App component, which owns raw
	// mode and bracketed paste state.
	private pauseInput?: () => void;
	private resumeInput?: () => void;

	constructor(options: Options) {
		autoBind(this);

		this.options = options;
		this.rootNode = dom.createNode('ink-root');
		this.rootNode.onComputeLayout = this.calculateLayout;

		this.isScreenReaderEnabled =
			options.isScreenReaderEnabled ??
			process.env['INK_SCREEN_READER'] === 'true';

		// CI detection takes precedence: even a TTY stdout in CI defaults to non-interactive.
		// Using Boolean(isTTY) (rather than an 'in' guard) correctly handles piped streams
		// where the property is absent (e.g. `node app.js | cat`).
		this.interactive = this.resolveInteractiveOption(options.interactive);

		this.alternateScreen = false;

		const unthrottled = options.debug || this.isScreenReaderEnabled;
		const maxFps = options.maxFps ?? 30;
		// Treat non-positive maxFps as an internal fallback case, not a supported
		// "disable throttling" mode. Keep animation scheduling on a normal cadence
		// so future changes don't accidentally reintroduce zero-delay loops.
		const renderThrottleMs =
			maxFps > 0 ? Math.max(1, Math.ceil(1000 / maxFps)) : 0;
		this.renderThrottleMs = unthrottled ? 0 : renderThrottleMs;

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
		this.rootNode.onStaticChange = this.handleStaticChange;
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
		const {columns, rows} = getWindowSize(this.options.stdout);
		this.lastTerminalWidth = columns;
		this.lastTerminalHeight = rows;

		this.fullStaticOutput = '';
		this.hasRenderedStaticOutput = false;

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

		this.setAlternateScreen(Boolean(options.alternateScreen));

		if (process.env['DEV'] === 'true') {
			// @ts-expect-error outdated types
			reconciler.injectIntoDevTools();
		}

		if (options.patchConsole) {
			this.patchConsole();
		}

		if (this.interactive) {
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

		void this.exitPromise.catch(noop);
	}

	resized = () => {
		const {columns: currentWidth, rows: currentHeight} = getWindowSize(
			this.options.stdout,
		);

		// We clear the screen when decreasing terminal width to prevent duplicate overlapping re-renders. Decreasing the height with a cursor shown also drops the frame rows below the cursor, so erase what is left and render the frame again.
		if (
			currentWidth < this.lastTerminalWidth ||
			(currentHeight < this.lastTerminalHeight &&
				this.log.getCursorPosition() !== undefined)
		) {
			this.log.clear();
			this.lastOutput = '';
			this.lastOutputToRender = '';
			this.lastOutputHeight = 0;
		}

		this.calculateLayout();
		dom.emitLayoutListeners(this.rootNode);
		this.onRender();

		this.lastTerminalWidth = currentWidth;
		this.lastTerminalHeight = currentHeight;
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

	setCursorPositionFromHook = (position: CursorPosition | undefined): void => {
		this.setCursorPositionInternal('hook', position);
	};

	setCursorPositionFromComponent = (
		position: CursorPosition | undefined,
	): void => {
		// NOTE: Absence of a <Cursor /> only means that we should hide the cursor
		// if we're already in component mode; if in hook mode, we simply aren't
		// using the component, so an empty position is expected
		if (position !== undefined || this.cursorMode === 'component') {
			this.setCursorPositionInternal('component', position);
		}
	};

	setCursorPositionInternal = (
		expectedMode: CursorMode,
		position: CursorPosition | undefined,
	): void => {
		if (this.cursorMode !== undefined && this.cursorMode !== expectedMode) {
			throw new Error('Mixing cursor modes');
		}

		const listener = this.options?.onCursorUpdated;
		if (
			listener != null &&
			cursorPositionChanged(this.cursorPosition, position)
		) {
			listener(position);
		}

		this.cursorMode = expectedMode;
		this.cursorPosition = position;
		this.log.setCursorPosition(position);
	};

	// Must stay referentially stable across `render()` calls: it feeds into App's
	// `setRawMode` identity, so a new function per `rerender()` would make every
	// `useInput`/`usePaste` re-run its raw-mode effect and reset the input parser,
	// dropping keys and pastes that were still in flight.
	handleKittyQueryResponse = (): void => {
		this.finishKittyDetection?.(true);
	};

	restoreLastOutput = (): void => {
		if (!this.interactive) {
			return;
		}

		// Screen-reader frames bypass `log()`, so restore them the same way: write, then sync log-update, with no cursor hide or placement.
		if (this.isScreenReaderEnabled) {
			this.options.stdout.write(this.lastOutputToRender);
			this.log.setCursorPosition(undefined);
			this.log.sync(this.lastOutputToRender);
			return;
		}

		// Clear() resets log-update's cursor state, so replay the latest cursor intent
		// before restoring output after external stdout/stderr writes.
		this.log.setCursorPosition(this.cursorPosition);
		this.log(this.lastOutputToRender || this.lastOutput + '\n');
	};

	calculateLayout = () => {
		const {yogaNode} = this.rootNode;

		// Calling exit() from an effect unmounts synchronously, so React's teardown commit can land after the root Yoga node is freed. There is nothing left to lay out.
		if (!yogaNode) {
			return;
		}

		const terminalWidth = getWindowSize(this.options.stdout).columns;

		yogaNode.setWidth(terminalWidth);

		yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
	};

	// Resets the accumulated static output when the <Static> identity changes so stale items from a previous instance are not replayed on future rewrites.
	handleStaticChange = (): void => {
		this.fullStaticOutput = '';
		this.hasRenderedStaticOutput = false;
	};

	onRender: () => void = () => {
		this.hasPendingThrottledRender = false;

		if (this.isUnmounted) {
			return;
		}

		// While suspended, the terminal belongs to a child process. Discard queued
		// renders; resume() forces a full redraw once Ink reclaims the terminal.
		// Resolve any awaited render commit so callers don't hang during suspension.
		if (this.isSuspended) {
			if (this.nextRenderCommit) {
				this.nextRenderCommit.resolve();
				this.nextRenderCommit = undefined;
			}

			return;
		}

		if (this.nextRenderCommit) {
			this.nextRenderCommit.resolve();
			this.nextRenderCommit = undefined;
		}

		// After clear(), the recorded frame is no longer on screen, so forget it and draw the next frame even when unchanged. Keep it while unmounting, so clear() followed by unmount() leaves the terminal clean.
		if (
			this.lastOutputHeight === 0 &&
			this.lastOutput !== '' &&
			!this.isUnmounting
		) {
			this.lastOutputToRender = '';
		}

		const startTime = performance.now();
		const {output, outputHeight, staticOutput, cursorPosition} = render(
			this.rootNode,
			this.isScreenReaderEnabled,
		);

		this.setCursorPositionFromComponent(cursorPosition);
		const renderTime = performance.now() - startTime;
		this.renderFrame(output, outputHeight, staticOutput);
		this.options.onRender?.({renderTime});
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
					interactive={this.interactive}
					renderThrottleMs={this.renderThrottleMs}
					writeToStdout={this.writeToStdout}
					writeToStderr={this.writeToStderr}
					setCursorPosition={this.setCursorPositionFromHook}
					onExit={this.handleAppExit}
					onWaitUntilRenderFlush={this.waitUntilRenderFlush}
					onSuspendTerminal={this.suspendTerminal}
					onRegisterInputControl={this.registerInputControl}
					onKittyQueryResponse={this.handleKittyQueryResponse}
				>
					<RootNodeContext.Provider value={this.rootNode}>
						{node}
					</RootNodeContext.Provider>
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

		// While suspended, the terminal belongs to a child process. Don't erase or
		// repaint Ink's frame around console output; the forced redraw on resume
		// restores the screen.
		if (this.isSuspended) {
			return;
		}

		if (this.options.debug) {
			this.options.stdout.write(data + this.fullStaticOutput + this.lastOutput);
			return;
		}

		if (!this.interactive) {
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

		// See writeToStdout: stay off the terminal while suspended.
		if (this.isSuspended) {
			return;
		}

		if (this.options.debug) {
			this.options.stderr.write(data);
			this.options.stdout.write(this.fullStaticOutput + this.lastOutput);
			return;
		}

		if (!this.interactive) {
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

	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	unmount(error?: Error | number | null): void {
		if (this.isUnmounted || this.isUnmounting) {
			return;
		}

		this.isUnmounting = true;

		if (this.beforeExitHandler) {
			process.off('beforeExit', this.beforeExitHandler);
			this.beforeExitHandler = undefined;
		}

		const {stdout} = this.options;
		const {canWriteToStdout} = getWritableStreamState(stdout);

		// Clear any pending throttled render timer on unmount. When stdout is writable,
		// flush so the final frame is emitted; otherwise cancel to avoid delayed callbacks.
		settleThrottle(this.throttledOnRender, canWriteToStdout);

		if (canWriteToStdout) {
			// If throttling is enabled and there is already a pending render, flushing above
			// is sufficient. Also avoid calling onRender() again when static output already
			// exists, as that can duplicate <Static> children output on exit (see issue #397).
			const shouldRenderFinalFrame =
				!this.throttledOnRender ||
				(!this.hasPendingThrottledRender && !this.hasRenderedStaticOutput);

			if (shouldRenderFinalFrame) {
				this.calculateLayout();
				this.onRender();
			}
		}

		// Mark as unmounted after the final render but before stdout writes
		// that could re-enter exit() via synchronous write callbacks.
		this.isUnmounted = true;

		this.unsubscribeExit();

		// Flush any pending throttled log writes if possible, otherwise cancel to
		// prevent delayed callbacks from writing to a closed stream.
		settleThrottle(this.throttledLog, canWriteToStdout);
		if (typeof this.restoreConsole === 'function') {
			// Once unmount starts, Ink stops trying to manage teardown-time
			// console output. Restoring the native console before React cleanup keeps
			// unmount behavior simple and avoids special-case handling for custom
			// streams, fullscreen frames, and alternate-screen teardown.
			this.restoreConsole();
		}

		const finishUnmount = (): void => {
			if (typeof this.unsubscribeResize === 'function') {
				this.unsubscribeResize();
			}

			// Cancel any in-progress auto-detection before checking protocol state
			this.finishKittyDetection?.(false);

			if (canWriteToStdout) {
				if (this.kittyProtocolEnabled) {
					this.writeBestEffort(this.options.stdout, '\u001B[<u');
					this.kittyProtocolEnabled = false;
				}

				if (this.interactive && !this.options.debug) {
					this.log.done();
				}

				// Alternate-screen content is disposable by design. We intentionally
				// leave it active until React cleanup finishes, then restore the
				// primary buffer without replaying prior frames, hook writes, or
				// diagnostics onto it. Trying to preserve teardown output across the
				// buffer switch adds fragile lifecycle-specific behavior, so Ink keeps
				// alternate-screen teardown intentionally simple and best-effort.
				if (this.alternateScreen) {
					this.writeBestEffort(
						this.options.stdout,
						ansiEscapes.exitAlternativeScreen,
					);
					this.writeBestEffort(this.options.stdout, showCursorEscape);
					this.alternateScreen = false;
				}

				if (!this.interactive) {
					// Non-interactive environments don't handle erasing ansi escapes well.
					// In debug mode, each render already writes to stdout, so only a trailing
					// newline is needed. In non-debug mode, write the last frame now (it was
					// deferred during rendering).
					this.options.stdout.write(
						this.options.debug ? '\n' : this.lastOutput + '\n',
					);
				}
			}

			this.kittyProtocolEnabled = false;

			instances.delete(this.options.stdout);

			// By the time this runs, React has torn down the tree and freed the child Yoga nodes, but the root node is Ink's own. Free it and drop the reference so any late access is a no-op rather than a use-after-free, as `freeYogaSubtree` does.
			this.rootNode.yogaNode?.free();
			this.rootNode.yogaNode = undefined;

			// Ensure all queued writes have been processed before resolving the
			// exit promise. Queue an empty write as a barrier — its callback fires
			// only after all prior writes complete.
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
			} else if (canWriteToStdout) {
				this.options.stdout.write('', resolveOrReject);
			} else {
				setImmediate(resolveOrReject);
			}
		};

		const concurrentReconciler = reconciler as {
			flushPassiveEffects?: () => boolean;
		};

		if (this.options.concurrent) {
			reconciler.updateContainerSync(null, this.container, null, noop);
			reconciler.flushSyncWork();
			concurrentReconciler.flushPassiveEffects?.();
			finishUnmount();
		} else {
			// Legacy mode: use updateContainerSync + flushSyncWork (sync)
			reconciler.updateContainerSync(null, this.container, null, noop);
			reconciler.flushSyncWork();
			finishUnmount();
		}
	}

	async waitUntilExit(): Promise<unknown> {
		if (!this.isUnmounting && !this.beforeExitHandler) {
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

		const {stdout} = this.options;
		const {canWriteToStdout} = getWritableStreamState(stdout);

		// Flush pending throttled render/log timers so their output is included in this wait.
		settleThrottle(this.throttledOnRender, canWriteToStdout);
		settleThrottle(this.throttledLog, canWriteToStdout);

		if (canWriteToStdout) {
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
		if (this.interactive && !this.options.debug) {
			this.log.clear();
			// Keep lastOutput so that unmount's final onRender sees it as unchanged, but no rows remain on screen.
			this.lastOutputHeight = 0;
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

	registerInputControl(pauseInput: () => void, resumeInput: () => void): void {
		this.pauseInput = pauseInput;
		this.resumeInput = resumeInput;
	}

	async suspendTerminal(callback: () => void | Promise<void>): Promise<void>;
	async suspendTerminal(): Promise<TerminalSuspension>;
	async suspendTerminal(
		callback?: () => void | Promise<void>,
	): Promise<void | TerminalSuspension> {
		this.beginSuspend();

		if (callback) {
			try {
				await callback();
			} finally {
				await this.endSuspend();
			}

			return undefined;
		}

		let resumed = false;
		const resume = async (): Promise<void> => {
			if (resumed) {
				return;
			}

			resumed = true;
			await this.endSuspend();
		};

		return {resume, [Symbol.asyncDispose]: resume};
	}

	private renderFrame(
		output: string,
		outputHeight: number,
		staticOutput: string,
	): void {
		// If <Static> output isn't empty, it means new children have been added to it
		const hasStaticOutput = staticOutput !== '';

		if (this.options.debug) {
			if (hasStaticOutput) {
				this.fullStaticOutput += staticOutput;
				this.hasRenderedStaticOutput = true;
			}

			this.lastOutput = output;
			this.lastOutputToRender = output;
			this.lastOutputHeight = outputHeight;
			this.options.stdout.write(this.fullStaticOutput + output);
			return;
		}

		if (!this.interactive) {
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

			const terminalWidth = getWindowSize(this.options.stdout).columns;
			const wrappedOutput = wrapAnsi(output, terminalWidth, {
				trim: false,
				hard: true,
			});

			if (wrappedOutput === this.lastOutputToRender && !hasStaticOutput) {
				if (sync) {
					this.options.stdout.write(esu);
				}

				return;
			}

			// Erase the main output before writing new static output or replacing the frame.
			// Log-update tracks the actual rows, including frames restored after external writes.
			this.log.clear();
			// After erasing, the last output is gone, so reset its height until the new frame is written.
			this.lastOutputHeight = 0;
			if (hasStaticOutput) {
				this.options.stdout.write(staticOutput);

				if (this.alternateScreen) {
					this.fullStaticOutput += staticOutput;
				}
			}

			this.options.stdout.write(wrappedOutput);

			this.lastOutput = output;
			this.lastOutputToRender = wrappedOutput;
			this.lastOutputHeight =
				wrappedOutput === '' ? 0 : wrappedOutput.split('\n').length;
			// Screen-reader output uses its own cursor placement.
			this.log.setCursorPosition(undefined);
			this.log.sync(wrappedOutput);

			if (sync) {
				this.options.stdout.write(esu);
			}

			return;
		}

		if (hasStaticOutput) {
			this.hasRenderedStaticOutput = true;

			if (this.alternateScreen) {
				this.fullStaticOutput += staticOutput;
			}
		}

		this.renderInteractiveFrame(
			output,
			outputHeight,
			hasStaticOutput ? staticOutput : '',
		);
	}

	private setAlternateScreen(enabled: boolean): void {
		this.alternateScreen = this.resolveAlternateScreenOption(
			enabled,
			this.interactive,
		);

		if (this.alternateScreen) {
			this.writeBestEffort(
				this.options.stdout,
				ansiEscapes.enterAlternativeScreen,
			);
			this.writeBestEffort(this.options.stdout, hideCursorEscape);
		}
	}

	private resolveInteractiveOption(interactive: boolean | undefined): boolean {
		return interactive ?? (!isInCi && Boolean(this.options.stdout.isTTY));
	}

	private resolveAlternateScreenOption(
		alternateScreen: boolean | undefined,
		interactive: boolean,
	): boolean {
		return (
			Boolean(alternateScreen) &&
			interactive &&
			Boolean(this.options.stdout.isTTY)
		);
	}

	private shouldSync(): boolean {
		return shouldSynchronize(this.options.stdout, this.interactive);
	}

	// Best-effort write: streams may already be destroyed during shutdown.
	private writeBestEffort(stream: OutputStream, data: string): void {
		try {
			stream.write(data);
		} catch {}
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
		const isTty = Boolean(this.options.stdout.isTTY);

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

		if (
			!shouldClearTerminal &&
			!hasStaticOutput &&
			outputToRender === this.lastOutputToRender &&
			!this.log.isCursorDirty()
		) {
			return;
		}

		// Keep the committed cursor position when its component skips rendering.
		this.log.setCursorPosition(this.cursorPosition);

		if (shouldClearTerminal) {
			const sync = this.shouldSync();
			if (sync) {
				this.options.stdout.write(bsu);
			}

			// On the primary screen, erase only the previous frame. Everything above it, whether <Static> output, console writes or the shell's own history, is left where the terminal put it, so nothing needs to be replayed there. Replaying `fullStaticOutput` used to restore what `clearTerminal` wiped; with scrollback preserved it only stamps another copy of every <Static> line into history on each full clear. New <Static> output from this frame is still written once, ahead of the frame.
			if (this.alternateScreen) {
				// The alternate screen has no scrollback, so whatever the full clear erases or an overflowing frame pushed off the top is gone for good. Replay the accumulated static output, which already includes this frame's new items, ahead of the frame.
				this.options.stdout.write(
					homeAndEraseDown + this.fullStaticOutput + outputToRender,
				);
			} else if (this.lastOutputHeight >= viewportRows) {
				// The previous frame filled the viewport, so erasing the viewport erases exactly that frame. The absolute sequence also sidesteps the cursor-relative erase that Windows consoles desynchronize (#969).
				this.options.stdout.write(
					homeAndEraseDown + staticOutput + outputToRender,
				);
			} else {
				// The previous frame only covers the bottom of the viewport. Erase those rows relative to the cursor and let the new frame scroll whatever sits above them into scrollback naturally.
				this.log.clear();
				this.options.stdout.write(staticOutput + outputToRender);
			}

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
		} else {
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

		if (mode === 'disabled') {
			return;
		}

		const flags: KittyFlagName[] = opts.flags ?? ['disambiguateEscapeCodes'];

		// 'enabled' force-enables the protocol as long as both streams are TTYs,
		// regardless of the interactive setting (e.g. even in CI).
		if (mode === 'enabled') {
			if (isTty(this.options.stdin) && this.options.stdout.isTTY) {
				this.enableKittyProtocol(flags);
			}

			return;
		}

		// Auto mode: require interactive + TTY
		if (
			!this.interactive ||
			!isTty(this.options.stdin) ||
			!this.options.stdout.isTTY
		) {
			return;
		}

		// Auto mode: query the terminal for kitty keyboard protocol support.
		// The CSI ? u query is safe to send to any terminal — unsupporting
		// terminals simply won't respond, and the 200ms timeout handles that.
		// This avoids maintaining a hardcoded whitelist of terminal names.
		this.confirmKittySupport(flags);
	}

	private confirmKittySupport(flags: KittyFlagName[]): void {
		// Consume responses through App's normal input pipeline so user input is never read twice.
		const finish = (supported: boolean): void => {
			this.finishKittyDetection = undefined;
			clearTimeout(timer);
			if (supported && !this.isUnmounted) {
				this.enableKittyProtocol(flags);
			}
		};

		// Register before writing the query so immediate responses are not missed.
		const timer = setTimeout(() => {
			finish(false);
		}, 200);
		this.finishKittyDetection = finish;
		this.options.stdout.write('\u001B[?u');
	}

	private enableKittyProtocol(flags: KittyFlagName[]): void {
		this.options.stdout.write(`\u001B[>${resolveFlags(flags)}u`);
		this.kittyProtocolEnabled = true;
		// Remember the flags so suspendTerminal() can re-enable the same protocol
		// after a child process has had the terminal.
		this.kittyFlags = flags;
	}

	private beginSuspend(): void {
		if (!this.interactive) {
			return;
		}

		if (this.isSuspended) {
			throw new Error(
				'The terminal is already suspended. Resume the current suspension before suspending again.',
			);
		}

		this.finishKittyDetection?.(false);
		this.isSuspended = true;

		if (!this.interactive || this.isUnmounted || this.isUnmounting) {
			return;
		}

		try {
			const {stdout} = this.options;
			const {canWriteToStdout} = getWritableStreamState(stdout);

			// Flush any pending render/log so the child starts from a settled screen.
			settleThrottle(this.throttledOnRender, canWriteToStdout);
			settleThrottle(this.throttledLog, canWriteToStdout);

			if (canWriteToStdout) {
				// Erase Ink's current frame, then show the cursor and re-arm the hide.
				// The forced redraw on resume hides the cursor again.
				this.log.clear();
				this.log.done();

				if (this.kittyProtocolEnabled) {
					this.writeBestEffort(this.options.stdout, '\u001B[<u');
					this.kittyProtocolEnabled = false;
				}

				if (this.alternateScreen) {
					this.writeBestEffort(
						this.options.stdout,
						ansiEscapes.exitAlternativeScreen,
					);
				}
			}

			// Hand input back to the terminal (raw mode off, bracketed paste off).
			this.pauseInput?.();
		} catch (error) {
			// If handing over the terminal fails partway, don't strand the app in a
			// suspended state with no way back. Best-effort reclaim input, clear the
			// flag, and rethrow so the caller sees the failure.
			this.isSuspended = false;

			try {
				this.resumeInput?.();
			} catch {}

			throw error;
		}
	}

	private async endSuspend(): Promise<void> {
		if (!this.isSuspended) {
			return;
		}

		this.isSuspended = false;

		if (!this.interactive || this.isUnmounted || this.isUnmounting) {
			return;
		}

		// Reclaim input only while the app still owns the terminal. After unmount, App cleanup has already restored raw mode, so resuming must not re-enable it.
		this.resumeInput?.();

		const {stdout} = this.options;
		const {canWriteToStdout} = getWritableStreamState(stdout);

		if (canWriteToStdout) {
			if (this.alternateScreen) {
				// Re-entering the alternate screen gives an empty buffer with no scrollback behind it, and the forced redraw below only carries new <Static> items. Replay the accumulated static output ahead of it, as the full-clear path does, so the rows the child process's turn erased come back. The debug redraw writes fullStaticOutput itself, so skip the replay there.
				this.writeBestEffort(
					this.options.stdout,
					ansiEscapes.enterAlternativeScreen +
						(this.options.debug ? '' : this.fullStaticOutput),
				);
			}

			if (this.kittyFlags) {
				this.writeBestEffort(
					this.options.stdout,
					`\u001B[>${resolveFlags(this.kittyFlags)}u`,
				);
				this.kittyProtocolEnabled = true;
			}
		}

		// Force a full redraw instead of diffing against the stale pre-suspension
		// frame, which the child process may have overwritten. A redraw failure here
		// is best-effort: it must not mask a callback error propagating through the
		// caller's finally block.
		this.lastOutput = '';
		this.lastOutputToRender = '';
		this.lastOutputHeight = 0;
		this.log.reset();

		try {
			this.calculateLayout();
			this.onRender();
			await this.waitUntilRenderFlush();
		} catch {}
	}
}
