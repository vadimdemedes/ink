import {ReactNode} from 'react';
import {Ink, createInk, InkOptions} from './ink';
import {createExperimentalInk} from './experimental/createExperimentalInk';
import instances from './instances';
import {ExperimentalDOMNode} from './experimental/dom';
import {DOMNode} from './dom';
import {Stream} from 'stream';

export interface RenderOptions {
	stdout?: NodeJS.WriteStream;
	stdin?: NodeJS.ReadStream;
	debug?: boolean;
	exitOnCtrlC?: boolean;
	experimental?: boolean;
}

interface InkControls<T> {
	rerender?: Ink<T>['render'];
	unmount?: Ink<T>['unmount'];
	waitUntilExit?: Ink<T>['waitUntilExit'];
	cleanup?: () => void;
}

type RenderFunction = <T extends NodeJS.WriteStream | RenderOptions = Record<string, unknown>>(
	node: ReactNode,
	options?: T
) => InkControls<
T extends { experimental: true } ? ExperimentalDOMNode : DOMNode
>;

const render: RenderFunction = (
	node,
	options
): InkControls<DOMNode | ExperimentalDOMNode> => {
	const defaults = {
		experimental: false,
		...(options || {})
	};

	const inkOptions: InkOptions = {
		stdout: process.stdout,
		stdin: process.stdin,
		debug: false,
		exitOnCtrlC: true,
		...streamToOptions(options)
	};

	const {stdout} = inkOptions;

	let instance: Ink<DOMNode | ExperimentalDOMNode>;
	if (defaults.experimental) {
		instance = retrieveCachedInstance<ExperimentalDOMNode>(stdout, () =>
			createExperimentalInk(inkOptions)
		);
	} else {
		instance = retrieveCachedInstance<DOMNode>(stdout, () =>
			createInk(inkOptions)
		);
	}

	instance.render(node);

	return {
		rerender: instance.render,
		unmount: () => instance.unmount(),
		waitUntilExit: instance.waitUntilExit,
		cleanup: () => instances.delete(inkOptions.stdout)
	};
};

function streamToOptions(stdout: NodeJS.WriteStream | RenderOptions): RenderOptions {
	if (stdout instanceof Stream) {
		return {
			stdout,
			stdin: process.stdin
		};
	}

	return stdout;
}

function retrieveCachedInstance<T>(
	stdout: NodeJS.WriteStream,
	createInstance: () => Ink<T>
) {
	let instance: Ink<T>;
	if (instances.has(stdout)) {
		instance = instances.get(stdout);
	} else {
		instance = createInstance();
		instances.set(stdout, instance);
	}

	return instance;
}

export default render;
