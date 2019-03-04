import React from 'react';
import throttle from 'lodash.throttle';
import autoBind from 'auto-bind';
import logUpdate from 'log-update';
import createReconciler from './reconciler';
import createRenderer from './renderer';
import {createNode} from './dom';
import App from './components/App';

export default class Instance {
	constructor(options) {
		autoBind(this);

		this.options = options;

		this.rootNode = createNode('root');
		this.renderer = createRenderer({
			terminalWidth: options.stdout.columns
		});

		this.log = logUpdate.create(options.stdout);
		this.throttledLog = options.debug ? this.log : throttle(this.log, {
			leading: true,
			trailing: true
		});

		// Ignore last render after unmounting a tree to prevent empty output before exit
		this.ignoreRender = false;

		// Store last output to only rerender when needed
		this.lastOutput = '';
		this.lastStaticOutput = '';

		// This variable is used only in debug mode to store full static output
		// so that it's rerendered every time, not just new static parts, like in non-debug mode
		this.fullStaticOutput = '';

		this.reconciler = createReconciler(this.onRender);
		this.container = this.reconciler.createContainer(this.rootNode, false);

		this.exitPromise = new Promise(resolve => {
			this.resolveExitPromise = resolve;
		});
	}

	onRender() {
		if (this.ignoreRender) {
			return;
		}

		const {output, staticOutput} = this.renderer(this.rootNode);

		// If <Static> output isn't empty, it means new children have been added to it
		const hasNewStaticOutput = staticOutput && staticOutput !== '\n' && staticOutput !== this.lastStaticOutput;

		if (this.options.debug) {
			if (hasNewStaticOutput) {
				this.fullStaticOutput += staticOutput;
				this.lastStaticOutput = staticOutput;
			}

			this.options.stdout.write(this.fullStaticOutput + output);
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasNewStaticOutput) {
			this.log.clear();
			this.options.stdout.write(staticOutput);
			this.log(output);

			this.lastStaticOutput = staticOutput;
		}

		if (output !== this.lastOutput) {
			this.throttledLog(output);

			this.lastOutput = output;
		}
	}

	render(node) {
		const tree = (
			<App
				stdin={this.options.stdin}
				stdout={this.options.stdout}
				exitOnCtrlC={this.options.exitOnCtrlC}
				onExit={this.unmount}
			>
				{node}
			</App>
		);

		this.reconciler.updateContainer(tree, this.container);
	}

	unmount() {
		this.onRender();
		this.log.done();
		this.ignoreRender = true;
		this.reconciler.updateContainer(null, this.container);
		this.resolveExitPromise();
	}

	waitUntilExit() {
		return this.exitPromise;
	}
}
