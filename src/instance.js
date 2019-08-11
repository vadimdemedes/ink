import React from 'react';
import throttle from 'lodash.throttle';
import autoBind from 'auto-bind';
import logUpdate from 'log-update';
import isCI from 'is-ci';
import signalExit from 'signal-exit';
import reconciler from './reconciler';
import experimentalReconciler from './experimental/reconciler';
import createRenderer from './renderer';
import createExperimentalRenderer from './experimental/renderer';
import * as dom from './dom';
import * as experimentalDom from './experimental/dom';
import instances from './instances';
import App from './components/App';

export default class Instance {
	constructor(options) {
		autoBind(this);

		this.options = options;

		if (options.experimental) {
			this.rootNode = experimentalDom.createNode('root');

			this.rootNode.onRender = options.debug ? this.onRender : throttle(this.onRender, 16, {
				leading: true,
				trailing: true
			});

			this.rootNode.onImmediateRender = this.onRender;

			this.renderer = createExperimentalRenderer({
				terminalWidth: options.stdout.columns
			});
		} else {
			this.rootNode = dom.createNode('root');
			this.rootNode.onRender = this.onRender;

			this.renderer = createRenderer({
				terminalWidth: options.stdout.columns
			});
		}

		this.log = logUpdate.create(options.stdout);
		this.throttledLog = options.debug ? this.log : throttle(this.log, {
			leading: true,
			trailing: true
		});

		// Ignore last render after unmounting a tree to prevent empty output before exit
		this.isUnmounted = false;

		// Store last output to only rerender when needed
		this.lastOutput = '';

		// This variable is used only in debug mode to store full static output
		// so that it's rerendered every time, not just new static parts, like in non-debug mode
		this.fullStaticOutput = '';

		if (options.experimental) {
			this.container = experimentalReconciler.createContainer(this.rootNode, false, false);
		} else {
			this.container = reconciler.createContainer(this.rootNode, false, false);
		}

		this.exitPromise = new Promise((resolve, reject) => {
			this.resolveExitPromise = resolve;
			this.rejectExitPromise = reject;
		});

		// Unmount when process exits
		this.unsubscribeExit = signalExit(this.unmount, {alwaysLast: false});
	}

	onRender() {
		if (this.isUnmounted) {
			return;
		}

		const {output, staticOutput} = this.renderer(this.rootNode);

		// If <Static> output isn't empty, it means new children have been added to it
		const hasStaticOutput = staticOutput && staticOutput !== '\n';

		if (this.options.debug) {
			if (hasStaticOutput) {
				this.fullStaticOutput += staticOutput;
			}

			this.options.stdout.write(this.fullStaticOutput + output);
			return;
		}

		// To ensure static output is cleanly rendered before main output, clear main output first
		if (hasStaticOutput) {
			if (!isCI) {
				this.log.clear();
			}

			this.options.stdout.write(staticOutput);

			if (!isCI) {
				if (this.options.experimental) {
					this.throttledLog(output);
				} else {
					this.log(output);
				}
			}
		}

		if (output !== this.lastOutput) {
			if (!isCI) {
				this.log(output);
			}

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

		if (this.options.experimental) {
			experimentalReconciler.updateContainer(tree, this.container);
		} else {
			reconciler.updateContainer(tree, this.container);
		}
	}

	unmount(error) {
		if (this.isUnmounted) {
			return;
		}

		this.onRender();
		this.unsubscribeExit();

		// CIs don't handle erasing ansi escapes well, so it's better to
		// only render last frame of non-static output
		if (isCI) {
			this.options.stdout.write(this.lastOutput + '\n');
		} else if (!this.options.debug) {
			this.log.done();
		}

		this.isUnmounted = true;

		if (this.options.experimental) {
			experimentalReconciler.updateContainer(null, this.container);
		} else {
			reconciler.updateContainer(null, this.container);
		}

		instances.delete(this.options.stdout);

		if (error instanceof Error) {
			this.rejectExitPromise(error);
		} else {
			this.resolveExitPromise();
		}
	}

	waitUntilExit() {
		return this.exitPromise;
	}
}
