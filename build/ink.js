import process from 'node:process';
import React from 'react';
import { throttle } from 'es-toolkit/compat';
import ansiEscapes from 'ansi-escapes';
import isInCi from 'is-in-ci';
import autoBind from 'auto-bind';
import signalExit from 'signal-exit';
import patchConsole from 'patch-console';
import reconciler from './reconciler.js';
import render from './renderer.js';
import * as dom from './dom.js';
import logUpdate from './log-update.js';
import instances from './instances.js';
import App from './components/App.js';
import Yoga from 'yoga-wasm-web/auto';
const noop = () => { };
export default class Ink {
    options;
    log;
    throttledLog;
    // Ignore last render after unmounting a tree to prevent empty output before exit
    isUnmounted;
    lastOutput;
    lastOutputHeight;
    container;
    rootNode = null;
    // This variable is used only in debug mode to store full static output
    // so that it's rerendered every time, not just new static parts, like in non-debug mode
    fullStaticOutput;
    exitPromise;
    restoreConsole;
    unsubscribeResize;
    constructor(options) {
        autoBind(this);
        this.options = options;
        this.log = logUpdate.create(options.stdout);
        this.throttledLog = options.debug
            ? this.log
            : throttle(this.log, undefined, {
                leading: true,
                trailing: true,
            });
        // Ignore last render after unmounting a tree to prevent empty output before exit
        this.isUnmounted = false;
        // Store last output to only rerender when needed
        this.lastOutput = '';
        // Store last output height so we know to clear the terminal when the previous output
        // height is greater than the current terminal height
        this.lastOutputHeight = 0;
        // This variable is used only in debug mode to store full static output
        // so that it's rerendered every time, not just new static parts, like in non-debug mode
        this.fullStaticOutput = '';
        // Unmount when process exits
        this.unsubscribeExit = signalExit(this.unmount, { alwaysLast: false });
        if (options.patchConsole) {
            this.patchConsole();
        }
        if (!isInCi) {
            options.stdout.on('resize', this.resized);
            this.unsubscribeResize = () => {
                options.stdout.off('resize', this.resized);
            };
        }
        this.rootNode = dom.createNode('ink-root');
        this.rootNode.onComputeLayout = this.calculateLayout;
        this.rootNode.onRender = options.debug
            ? this.onRender
            : throttle(this.onRender, 32, {
                leading: true,
                trailing: true,
            });
        this.rootNode.onImmediateRender = this.onRender;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.container = reconciler.createContainer(this.rootNode, 
        // Legacy mode
        0, null, false, null, 'id', () => { }, null);
        if (process.env['DEV'] === 'true') {
            reconciler.injectIntoDevTools({
                bundleType: 0,
                // Reporting React DOM's version, not Ink's
                // See https://github.com/facebook/react/issues/16666#issuecomment-532639905
                version: '16.13.1',
                rendererPackageName: 'ink',
            });
        }
    }
    resized = () => {
        this.calculateLayout();
        this.onRender(true);
    };
    resolveExitPromise = () => { };
    rejectExitPromise = () => { };
    unsubscribeExit = () => { };
    calculateLayout = () => {
        // The 'columns' property can be undefined or 0 when not using a TTY.
        // In that case we fall back to 80.
        const terminalWidth = this.options.stdout.columns || 80;
        if (!this.rootNode) {
            // Yoga is not initialized yet
            return;
        }
        this.rootNode.yogaNode.setWidth(terminalWidth);
        this.rootNode.yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
    };
    onRender(didResize = false) {
        if (this.isUnmounted) {
            return;
        }
        if (!this.rootNode) {
            // Yoga is not initialized yet
            return;
        }
        const { output, outputHeight, staticOutput } = render(this.rootNode);
        // If <Static> output isn't empty, it means new children have been added to it
        const hasStaticOutput = staticOutput && staticOutput !== '\n';
        if (this.options.debug) {
            if (hasStaticOutput) {
                this.fullStaticOutput += staticOutput;
            }
            this.options.stdout.write(this.fullStaticOutput + output);
            return;
        }
        if (isInCi) {
            if (hasStaticOutput) {
                this.options.stdout.write(staticOutput);
            }
            this.lastOutput = output;
            this.lastOutputHeight = outputHeight;
            return;
        }
        if (hasStaticOutput) {
            this.fullStaticOutput += staticOutput;
        }
        if (outputHeight >= this.options.stdout.rows ||
            this.lastOutputHeight >= this.options.stdout.rows) {
            if (this.options.onFlicker) {
                this.options.onFlicker();
            }
            // We add an extra newline to match what logOutput does
            this.options.stdout.write(ansiEscapes.clearTerminal + this.fullStaticOutput + output + '\n');
            this.lastOutput = output;
            this.lastOutputHeight = outputHeight;
            // Account for the extra newline
            this.log.updateLineCount(output + '\n');
            return;
        }
        if (didResize) {
            this.options.stdout.write(ansiEscapes.clearTerminal + this.fullStaticOutput + output + '\n');
            this.lastOutput = output;
            this.lastOutputHeight = outputHeight;
            this.log.updateLineCount(output + '\n');
            return;
        }
        // To ensure static output is cleanly rendered before main output, clear main output first
        if (hasStaticOutput) {
            this.log.clear();
            this.options.stdout.write(staticOutput);
            this.throttledLog(output);
        }
        if (!hasStaticOutput && output !== this.lastOutput) {
            this.throttledLog(output);
        }
        this.lastOutput = output;
        this.lastOutputHeight = outputHeight;
    }
    render(node) {
        const tree = (React.createElement(App, { stdin: this.options.stdin, stdout: this.options.stdout, stderr: this.options.stderr, writeToStdout: this.writeToStdout, writeToStderr: this.writeToStderr, exitOnCtrlC: this.options.exitOnCtrlC, onExit: this.unmount }, node));
        reconciler.updateContainer(tree, this.container, null, noop);
    }
    writeToStdout(data) {
        if (this.isUnmounted) {
            return;
        }
        if (this.options.debug) {
            this.options.stdout.write(data + this.fullStaticOutput + this.lastOutput);
            return;
        }
        if (isInCi) {
            this.options.stdout.write(data);
            return;
        }
        this.log.clear();
        this.options.stdout.write(data);
        this.log(this.lastOutput);
    }
    writeToStderr(data) {
        if (this.isUnmounted) {
            return;
        }
        if (this.options.debug) {
            this.options.stderr.write(data);
            this.options.stdout.write(this.fullStaticOutput + this.lastOutput);
            return;
        }
        if (isInCi) {
            this.options.stderr.write(data);
            return;
        }
        this.log.clear();
        this.options.stderr.write(data);
        this.log(this.lastOutput);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    unmount(error) {
        if (this.isUnmounted) {
            return;
        }
        this.calculateLayout();
        this.onRender();
        this.unsubscribeExit();
        if (typeof this.restoreConsole === 'function') {
            this.restoreConsole();
        }
        if (typeof this.unsubscribeResize === 'function') {
            this.unsubscribeResize();
        }
        // CIs don't handle erasing ansi escapes well, so it's better to
        // only render last frame of non-static output
        if (isInCi) {
            this.options.stdout.write(this.lastOutput + '\n');
        }
        else if (!this.options.debug) {
            this.log.done();
        }
        this.isUnmounted = true;
        reconciler.updateContainer(null, this.container, null, noop);
        instances.delete(this.options.stdout);
        if (error instanceof Error) {
            this.rejectExitPromise(error);
        }
        else {
            this.resolveExitPromise();
        }
    }
    async waitUntilExit() {
        this.exitPromise ||= new Promise((resolve, reject) => {
            this.resolveExitPromise = resolve;
            this.rejectExitPromise = reject;
        });
        return this.exitPromise;
    }
    clear() {
        if (!isInCi && !this.options.debug) {
            this.log.clear();
        }
    }
    patchConsole() {
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
}
//# sourceMappingURL=ink.js.map