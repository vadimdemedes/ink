import ansiEscapes from 'ansi-escapes';
import isCI from 'is-ci';
import throttle from 'lodash.throttle';
import logUpdate from 'log-update';
import React, {ReactNode} from 'react';
import signalExit from 'signal-exit';
import {App} from '../components/App';
import {Ink, InkOptions} from '../ink';
import {instances} from '../instances';
import {reconciler} from './reconciler';
import {createRenderer} from './renderer';
import {createNode} from './dom';

export function createExperimentalInk(options: InkOptions): Ink {
	const rootNode = createNode('root');
	const log = logUpdate.create(options.stdout);
	const throttledLog = options.debug ?
		log :
		throttle(log, undefined, {
			leading: true,
			trailing: true
		});

	const renderer = createRenderer({
		terminalWidth: options.stdout.columns
	});

	const onRender = () => {
		if (instance.isUnmounted) {
			return;
		}

		const {output, outputHeight, staticOutput} = renderer(rootNode);

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

		if (outputHeight >= options.stdout.rows) {
			options.stdout.write(
				ansiEscapes.clearTerminal + instance.fullStaticOutput + output
			);
			instance.lastOutput = output;
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			log.clear();
			options.stdout.write(staticOutput);
		}

		if (output !== instance.lastOutput) {
			throttledLog(output);
		}
	};

	rootNode.onRender = options.debug ?
		onRender :
		throttle(onRender, 16, {
			leading: true,
			trailing: true
		});
	rootNode.onImmediateRender = onRender;

	let resolveExitPromise: Ink['resolveExitPromise'] = () => {};
	let rejectExitPromise: Ink['rejectExitPromise'] = () => {};

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
		reconciler.updateContainer(null, instance.container, undefined, undefined);

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

	const instance: Ink = {
		options,
		log,
		isUnmounted: false,
		throttledLog,
		lastOutput: '',
		fullStaticOutput: '',
		rootNode,
		renderer,
		render,
		onRender,
		container,
		exitPromise,
		resolveExitPromise,
		rejectExitPromise,
		unsubscribeExit,
		unmount,
		waitUntilExit: options.waitUntilExit ?? waitUntilExit
	};

	return instance;
}
