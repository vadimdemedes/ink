import React, {ReactNode} from 'react';
import throttle from 'lodash.throttle';
import logUpdate, {LogUpdate} from 'log-update';
import isCI from 'is-ci';
import {reconciler} from './reconciler';
import {createRenderer, InkRenderer} from './renderer';
import signalExit from 'signal-exit';
import {createNode, DOMElement} from './dom';
import {FiberRoot} from 'react-reconciler';
import {instances} from './instances';
import {App} from './components/App';

export interface InkOptions {
	stdout: NodeJS.WriteStream;
	stdin: NodeJS.ReadStream;
	debug: boolean;
	exitOnCtrlC: boolean;
	experimental: boolean;
	waitUntilExit?: () => Promise<void>;
}

export interface Ink {
	options: InkOptions;
	log: LogUpdate;
	throttledLog: LogUpdate;
	// Ignore last render after unmounting a tree to prevent empty output before exit
	isUnmounted: boolean;
	lastOutput: string;
	container: FiberRoot;
	rootNode: DOMElement;
	// This variable is used only in debug mode to store full static output
	// so that it's rerendered every time, not just new static parts, like in non-debug mode
	fullStaticOutput: string;
	render: <Props>(tree: React.ReactElement<Props>) => void;
	renderer: InkRenderer;
	onRender: () => void;
	waitUntilExit: () => Promise<void>;
	exitPromise: Promise<void>;
	unmount: () => void;
	resolveExitPromise: () => void;
	rejectExitPromise: (reason?: Error) => void;
	unsubscribeExit: () => void;
}

export function createInk(options: InkOptions): Ink {
	const rootNode = createNode('root');
	const log = logUpdate.create(options.stdout);
	const throttledLog = options.debug ?
		log :
		throttle(log, undefined, {
			leading: true,
			trailing: true
		});

	let resolveExitPromise: Ink['resolveExitPromise'] = () => {};
	let rejectExitPromise: Ink['rejectExitPromise'] = () => {};

	const renderer = createRenderer({
		terminalWidth: options.stdout.columns
	});

	const onRender = () => {
		if (instance.isUnmounted) {
			return;
		}

		const {output, staticOutput} = renderer(rootNode);

		// If <Static> output isn't empty, it means new children have been added to it
		const hasStaticOutput = staticOutput && staticOutput !== '\n';

		if (options.debug) {
			if (hasStaticOutput) {
				instance.fullStaticOutput += staticOutput;
			}

			options.stdout.write(instance.fullStaticOutput + output);
			return;
		}

		if (isCI) {
			if (hasStaticOutput) {
				options.stdout.write(staticOutput);
			}

			instance.lastOutput = output;
			return;
		}

		if (hasStaticOutput) {
			instance.fullStaticOutput += staticOutput;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			log.clear();
			options.stdout.write(staticOutput);
		}

		if (output !== instance.lastOutput) {
			log(output);
		}
	};

	rootNode.onRender = onRender;

	const container = reconciler.createContainer(rootNode, false, false);

	const unmount = (exitCode?: number | Error | null) => {
		if (instance.isUnmounted) {
			return;
		}

		onRender();
		unsubscribeExit();

		// CIs don't handle erasing ansi escapes well, so it's better to
		// only render last frame of non-static output
		if (isCI) {
			options.stdout.write(instance.lastOutput + '\n');
		} else if (!options.debug) {
			log.done();
		}

		instance.isUnmounted = true;

		reconciler.updateContainer(null, container, undefined, undefined);

		instances.delete(options.stdout);

		if (exitCode instanceof Error) {
			rejectExitPromise(exitCode);
		} else {
			resolveExitPromise();
		}
	};

	const render = (node: ReactNode) => {
		const tree = (
			<App
				stdin={options.stdin}
				stdout={options.stdout}
				exitOnCtrlC={options.exitOnCtrlC}
				onExit={unmount}
			>
				{node}
			</App>
		);

		reconciler.updateContainer(tree, container, undefined, undefined);
	};

	const unsubscribeExit = signalExit(unmount, {alwaysLast: false});

	const exitPromise = new Promise<void>((resolve, reject) => {
		resolveExitPromise = resolve;
		rejectExitPromise = reject;
	});

	const waitUntilExit = () => exitPromise;

	const instance = {
		options,
		log,
		fullStaticOutput: '',
		renderer,
		onRender,
		isUnmounted: false,
		throttledLog,
		// Store last output to only rerender when needed
		lastOutput: '',
		rootNode,
		render,
		container,
		exitPromise,
		resolveExitPromise,
		rejectExitPromise,
		unmount,
		unsubscribeExit,
		waitUntilExit: options.waitUntilExit ?? waitUntilExit
	};

	return instance;
}
