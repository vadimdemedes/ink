import readline from 'readline';
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import cliCursor from 'cli-cursor';
import {default as keycode} from 'keycode';
import AppContext from './AppContext';
import StdinContext from './StdinContext';
import StdoutContext from './StdoutContext';

class DOMKeypressDispatcher extends PureComponent {
	static propTypes = {
		stdin: PropTypes.object.isRequired,
		setRawMode: PropTypes.func.isRequired,
		document: PropTypes.any,
		window: PropTypes.any
	};

	componentDidMount() {
		if (this.props.document) {
			const {stdin, setRawMode} = this.props;
			setRawMode(true);
			stdin.on('keypress', this.dispatchInput);
		}
	}

	componentWillUnmount() {
		if (this.props.document) {
			const {stdin, setRawMode} = this.props;
			stdin.removeListener('keypress', this.dispatchInput);
			setRawMode(false);
		}
	}

	render() {
		return (null);
	}

	dispatchInput = (str, key) => {
		const code = keycode(key.name);
		const downEvent = new this.props.window.KeyboardEvent('keydown', {
			key: key.name,
			charCode: code,
			ctrlKey: key.ctrl,
			shiftKey: key.shift,
			keyCode: code,
			which: code,
			bubbles: true,
			repeat: false,
			location: 0,
			isComposing: false
		});
		this.props.document.activeElement.dispatchEvent(downEvent);
		const pressEvent = new this.props.window.KeyboardEvent('keypress', {
			key: key.name,
			charCode: code,
			ctrlKey: key.ctrl,
			shiftKey: key.shift,
			keyCode: code,
			which: code,
			bubbles: true,
			repeat: false,
			location: 0,
			isComposing: false
		});
		this.props.document.activeElement.dispatchEvent(pressEvent);
		const upEvent = new this.props.window.KeyboardEvent('keyup', {
			key: key.name,
			charCode: code,
			ctrlKey: key.ctrl,
			shiftKey: key.shift,
			keyCode: code,
			which: code,
			bubbles: true,
			repeat: false,
			location: 0,
			isComposing: false
		});
		this.props.document.activeElement.dispatchEvent(upEvent);
	}
}

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
export default class App extends PureComponent {
	static propTypes = {
		children: PropTypes.node.isRequired,
		stdin: PropTypes.object.isRequired,
		stdout: PropTypes.object.isRequired,
		exitOnCtrlC: PropTypes.bool.isRequired,
		onExit: PropTypes.func.isRequired,
		window: PropTypes.object,
		document: PropTypes.object
	};

	// Determines if TTY is supported on the provided stdin
	isRawModeSupported() {
		return this.props.stdin.isTTY;
	}

	constructor() {
		super();

		// Count how many components enabled raw mode to avoid disabling
		// raw mode until all components don't need it anymore
		this.rawModeEnabledCount = 0;
	}

	render() {
		const keyboardEventDispatcher = (this.props.window && this.props.document) ? (
			<DOMKeypressDispatcher
				window={this.props.window}
				document={this.props.document}
				stdin={this.props.stdin}
				setRawMode={this.handleSetRawMode}
			/>
		) : null;
		return (
			<AppContext.Provider
				value={{
					exit: this.handleExit
				}}
			>
				<StdinContext.Provider
					value={{
						stdin: this.props.stdin,
						setRawMode: this.handleSetRawMode,
						isRawModeSupported: this.isRawModeSupported()
					}}
				>
					<StdoutContext.Provider
						value={{
							stdout: this.props.stdout
						}}
					>
						{keyboardEventDispatcher}
						{this.props.children}
					</StdoutContext.Provider>
				</StdinContext.Provider>
			</AppContext.Provider>
		);
	}

	componentDidMount() {
		cliCursor.hide(this.props.stdout);
	}

	componentWillUnmount() {
		cliCursor.show(this.props.stdout);

		// ignore calling setRawMode on an handle stdin it cannot be called
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}
	}

	componentDidCatch(error) {
		this.handleExit(error);
	}

	handleSetRawMode = isEnabled => {
		const {stdin} = this.props;

		if (!this.isRawModeSupported()) {
			if (stdin === process.stdin) {
				throw new Error(
					'Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported'
				);
			} else {
				throw new Error(
					'Raw mode is not supported on the stdin provided to Ink.\nRead about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported'
				);
			}
		}

		stdin.setEncoding('utf8');

		if (isEnabled) {
			// Ensure raw mode is enabled only once
			if (this.rawModeEnabledCount === 0) {
				stdin.addListener('data', this.handleInput);
				stdin.resume();
				stdin.setRawMode(true);
				readline.emitKeypressEvents(stdin);
			}

			this.rawModeEnabledCount++;
			return;
		}

		// Disable raw mode only when no components left that are using it
		if (--this.rawModeEnabledCount === 0) {
			stdin.setRawMode(false);
			stdin.removeListener('data', this.handleInput);
			stdin.pause();
		}
	};

	handleInput = input => {
		// Exit on Ctrl+C
		if (input === '\x03' && this.props.exitOnCtrlC) { // eslint-disable-line unicorn/no-hex-escape
			this.handleExit();
		}
	};

	handleExit = error => {
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}

		this.props.onExit(error);
	}
}
