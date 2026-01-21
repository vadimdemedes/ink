import {Stream} from 'node:stream';
import process from 'node:process';
import type {ReactNode} from 'react';
import Ink, {type Options as InkOptions, type RenderMetrics} from './ink.js';
import instances from './instances.js';
import {type KittyKeyboardOptions} from './kitty-keyboard.js';

export type RenderOptions = {
	/**
	Output stream where the app will be rendered.

	@default process.stdout
	*/
	stdout?: NodeJS.WriteStream;

	/**
	Input stream where app will listen for input.

	@default process.stdin
	*/
	stdin?: NodeJS.ReadStream;

	/**
	Error stream.
	@default process.stderr
	*/
	stderr?: NodeJS.WriteStream;

	/**
	If true, each update will be rendered as separate output, without replacing the previous one.

	@default false
	*/
	debug?: boolean;

	/**
	Configure whether Ink should listen for Ctrl+C keyboard input and exit the app. This is needed in case `process.stdin` is in raw mode, because then Ctrl+C is ignored by default and the process is expected to handle it manually.

	@default true
	*/
	exitOnCtrlC?: boolean;

	/**
	Patch console methods to ensure console output doesn't mix with Ink's output.

	@default true
	*/
	patchConsole?: boolean;

	/**
	Runs the given callback after each render and re-render.
	*/
	onRender?: (metrics: RenderMetrics) => void;

	/**
	Enable screen reader support. See https://github.com/vadimdemedes/ink/blob/master/readme.md#screen-reader-support

	@default process.env['INK_SCREEN_READER'] === 'true'
	*/
	isScreenReaderEnabled?: boolean;

	/**
	Maximum frames per second for render updates.
	This controls how frequently the UI can update to prevent excessive re-rendering.
	Higher values allow more frequent updates but may impact performance.

	@default 30
	*/
	maxFps?: number;

	/**
	Enable incremental rendering mode which only updates changed lines instead of redrawing the entire output.
	This can reduce flickering and improve performance for frequently updating UIs.

	@default false
	*/
	incrementalRendering?: boolean;

	/**
	Enable React Concurrent Rendering mode.

	When enabled:
	- Suspense boundaries work correctly with async data
	- `useTransition` and `useDeferredValue` are fully functional
	- Updates can be interrupted for higher priority work

	Note: Concurrent mode changes the timing of renders. Some tests may need to use `act()` to properly await updates. The `concurrent` option only takes effect on the first render for a given stdout. If you need to change the rendering mode, call `unmount()` first.

	@default false
	*/
	concurrent?: boolean;

	/**
	Configure kitty keyboard protocol support for enhanced keyboard input.
	Enables additional modifiers (super, hyper, capsLock, numLock) and
	disambiguated key events in terminals that support the protocol.

	@see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
	*/
	kittyKeyboard?: KittyKeyboardOptions;
};

export type Instance = {
	/**
	Replace the previous root node with a new one or update props of the current root node.
	*/
	rerender: Ink['render'];

	/**
	Manually unmount the whole Ink app.
	*/
	unmount: Ink['unmount'];

	/**
	Returns a promise that resolves when the app is unmounted.
	*/
	waitUntilExit: Ink['waitUntilExit'];

	cleanup: () => void;

	/**
	Clear output.
	*/
	clear: () => void;
};

/**
Mount a component and render the output.
*/
const render = (
	node: ReactNode,
	options?: NodeJS.WriteStream | RenderOptions,
): Instance => {
	const inkOptions: InkOptions = {
		stdout: process.stdout,
		stdin: process.stdin,
		stderr: process.stderr,
		debug: false,
		exitOnCtrlC: true,
		patchConsole: true,
		maxFps: 30,
		incrementalRendering: false,
		concurrent: false,
		...getOptions(options),
	};

	const instance: Ink = getInstance(
		inkOptions.stdout,
		() => new Ink(inkOptions),
		inkOptions.concurrent ?? false,
	);

	instance.render(node);

	return {
		rerender: instance.render,
		unmount() {
			instance.unmount();
		},
		waitUntilExit: instance.waitUntilExit,
		cleanup: () => instances.delete(inkOptions.stdout),
		clear: instance.clear,
	};
};

export default render;

const getOptions = (
	stdout: NodeJS.WriteStream | RenderOptions | undefined = {},
): RenderOptions => {
	if (stdout instanceof Stream) {
		return {
			stdout,
			stdin: process.stdin,
		};
	}

	return stdout;
};

const getInstance = (
	stdout: NodeJS.WriteStream,
	createInstance: () => Ink,
	concurrent: boolean,
): Ink => {
	let instance = instances.get(stdout);

	if (!instance) {
		instance = createInstance();
		instances.set(stdout, instance);
	} else if (instance.isConcurrent !== concurrent) {
		console.warn(
			`Warning: render() was called with concurrent: ${concurrent}, but the existing instance for this stdout uses concurrent: ${instance.isConcurrent}. ` +
				`The concurrent option only takes effect on the first render. Call unmount() first if you need to change the rendering mode.`,
		);
	}

	return instance;
};
