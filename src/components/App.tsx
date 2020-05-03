import React, {PureComponent, ReactNode} from 'react';
import PropTypes from 'prop-types';
import cliCursor from 'cli-cursor';
import {AppContext} from './AppContext';
import {StdinContext} from './StdinContext';
import {StdoutContext} from './StdoutContext';
import {StderrContext} from './StderrContext';

interface Props {
	children: ReactNode;
	stdin: NodeJS.ReadStream;
	stdout: NodeJS.WriteStream;
	stderr: NodeJS.WriteStream;
	writeToStdout: (data: string) => void;
	writeToStderr: (data: string) => void;
	exitOnCtrlC: boolean;
	onExit: (error?: Error) => void;
}

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
export class App extends PureComponent<Props> {
	static propTypes = {
		children: PropTypes.node.isRequired,
		stdin: PropTypes.object.isRequired,
		stdout: PropTypes.object.isRequired,
		stderr: PropTypes.object.isRequired,
		writeToStdout: PropTypes.func.isRequired,
		writeToStderr: PropTypes.func.isRequired,
		exitOnCtrlC: PropTypes.bool.isRequired, // eslint-disable-line react/boolean-prop-naming
		onExit: PropTypes.func.isRequired
	};

	// Count how many components enabled raw mode to avoid disabling
	// raw mode until all components don't need it anymore
	rawModeEnabledCount = 0;

	// Determines if TTY is supported on the provided stdin
	isRawModeSupported(): boolean {
		return this.props.stdin.isTTY;
	}

	render() {
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
							stdout: this.props.stdout,
							write: this.props.writeToStdout
						}}
					>
						<StderrContext.Provider
							value={{
								stderr: this.props.stderr,
								write: this.props.writeToStderr
							}}
						>
							{this.props.children}
						</StderrContext.Provider>
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

	componentDidCatch(error: Error) {
		this.handleExit(error);
	}

	handleSetRawMode = (isEnabled: boolean): void => {
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

	handleInput = (input: string): void => {
		// Exit on Ctrl+C
		// eslint-disable-next-line unicorn/no-hex-escape
		if (input === '\x03' && this.props.exitOnCtrlC) {
			this.handleExit();
		}
	};

	handleExit = (error?: Error): void => {
		if (this.isRawModeSupported()) {
			this.handleSetRawMode(false);
		}

		this.props.onExit(error);
	};
}
