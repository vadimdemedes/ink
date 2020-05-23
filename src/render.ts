import type {ReactElement} from 'react';
import Ink from './ink';
import type {Options as InkOptions} from './ink';
import instances from './instances';
import {Stream} from 'stream';

export interface RenderOptions {
	/**
	 * Output stream where app will be rendered.
	 *
	 * @default process.stdout
	 */
	stdout?: NodeJS.WriteStream;
	/**
	 * Input stream where app will listen for input.
	 *
	 * @default process.stdin
	 */
	stdin?: NodeJS.ReadStream;
	/**
	 * Error stream.
	 * @default process.stderr
	 */
	stderr?: NodeJS.WriteStream;
	/**
	 * If true, each update will be rendered as a separate output, without replacing the previous one.
	 *
	 * @default false
	 */
	debug?: boolean;
	/**
	 * Configure whether Ink should listen to Ctrl+C keyboard input and exit the app. This is needed in case `process.stdin` is in raw mode, because then Ctrl+C is ignored by default and process is expected to handle it manually.
	 *
	 * @default true
	 */
	exitOnCtrlC?: boolean;
}

export interface Instance {
	/**
	 * Replace previous root node with a new one or update props of the current root node.
	 */
	rerender: Ink['render'];
	/**
	 * Manually unmount the whole Ink app.
	 */
	unmount: Ink['unmount'];
	/**
	 * Returns a promise, which resolves when app is unmounted.
	 */
	waitUntilExit: Ink['waitUntilExit'];
	cleanup?: () => void;

	// Clear output
	clear: () => void;
}

type RenderFunction = <Props, K extends NodeJS.WriteStream | RenderOptions>(
	tree: ReactElement<Props>,
	options?: K
) => Instance;

/**
 * Mount a component and render the output.
 */
const render: RenderFunction = (node, options): Instance => {
	const inkOptions: InkOptions = {
		stdout: process.stdout,
		stdin: process.stdin,
		stderr: process.stderr,
		debug: false,
		exitOnCtrlC: true,
		...getOptions(options)
	};

	const instance: Ink = getInstance(
		inkOptions.stdout,
		() => new Ink(inkOptions)
	);
	instance.render(node);

	return {
		rerender: instance.render,
		unmount: () => instance.unmount(),
		waitUntilExit: instance.waitUntilExit,
		cleanup: () => instances.delete(inkOptions.stdout),
		clear: instance.clear
	};
};

export default render;

const getOptions = (
	stdout: NodeJS.WriteStream | RenderOptions | undefined = {}
): RenderOptions => {
	if (stdout instanceof Stream) {
		return {
			stdout,
			stdin: process.stdin
		};
	}

	return stdout;
};

const getInstance = (
	stdout: NodeJS.WriteStream,
	createInstance: () => Ink
): Ink => {
	let instance: Ink;

	if (instances.has(stdout)) {
		instance = instances.get(stdout);
	} else {
		instance = createInstance();
		instances.set(stdout, instance);
	}

	return instance;
};
