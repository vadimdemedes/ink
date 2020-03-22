import {ReactElement} from 'react';
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

type RenderFunction = <Props, K extends NodeJS.WriteStream | RenderOptions>(
	tree: ReactElement<Props>,
	options?: K
) => InkControls<
K extends { experimental: true } ? ExperimentalDOMNode : DOMNode
>;

type Instance = InkControls<DOMNode | ExperimentalDOMNode>;

const render: RenderFunction = (
	node,
	options
): Instance => {
	const inkOptions: InkOptions = {
		stdout: process.stdout,
		stdin: process.stdin,
		debug: false,
		exitOnCtrlC: true,
		experimental: false,
		...optionsFrom(options)
	};

	const {stdout} = inkOptions;

	let instance: Ink<DOMNode | ExperimentalDOMNode>;
	if (inkOptions.experimental) {
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

function optionsFrom(stdout: NodeJS.WriteStream | RenderOptions | undefined = {}): RenderOptions {
	if (stdout instanceof Stream) {
		return {
			stdout,
			stdin: process.stdin,
			experimental: false
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
