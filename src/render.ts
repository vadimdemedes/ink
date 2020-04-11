import {ReactElement} from 'react';
import {Ink, InkOptions} from './ink';
import {instances} from './instances';
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
	/**
	 * Enable experimental mode and use a new and faster reconciler and renderer.
	 * There should be no changes to the output. If there are, please report it.
	 *
	 * @default false
	 */
	experimental?: boolean;
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
}

type RenderFunction = <Props, K extends NodeJS.WriteStream | RenderOptions>(
	tree: ReactElement<Props>,
	options?: K
) => Instance;

/**
 * Mount a component and render the output.
 */
export const render: RenderFunction = (node, options): Instance => {
	const inkOptions: InkOptions = {
		stdout: process.stdout,
		stdin: process.stdin,
		debug: false,
		exitOnCtrlC: true,
		experimental: false,
		...optionsFrom(options)
	};

	const {stdout} = inkOptions;

	const instance: Ink = retrieveCachedInstance(stdout, () => new Ink(inkOptions));

	instance.render(node);

	return {
		rerender: instance.render,
		unmount: () => instance.unmount(),
		waitUntilExit: instance.waitUntilExit,
		cleanup: () => instances.delete(inkOptions.stdout)
	};
};

function optionsFrom(
	stdout: NodeJS.WriteStream | RenderOptions | undefined = {}
): RenderOptions {
	if (stdout instanceof Stream) {
		return {
			stdout,
			stdin: process.stdin,
			experimental: false
		};
	}

	return stdout;
}

function retrieveCachedInstance(
	stdout: NodeJS.WriteStream,
	createInstance: () => Ink
) {
	let instance: Ink;
	if (instances.has(stdout)) {
		instance = instances.get(stdout);
	} else {
		instance = createInstance();
		instances.set(stdout, instance);
	}

	return instance;
}
