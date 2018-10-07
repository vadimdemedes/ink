import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import cliCursor from 'cli-cursor';
import StdinContext from './StdinContext';
import StdoutContext from './StdoutContext';

// Root component for all Ink apps
// It renders stdin and stdout contexts, so that children can access them if needed
// It also handles Ctrl+C exiting and cursor visibility
export default class App extends PureComponent {
	static propTypes = {
		children: PropTypes.node.isRequired,
		stdin: PropTypes.object.isRequired,
		stdout: PropTypes.object.isRequired
	};

	render() {
		return (
			<StdinContext.Provider
				value={{
					stdin: this.props.stdin,
					setRawMode: this.handleSetRawMode
				}}
			>
				<StdoutContext.Provider
					value={{
						stdout: this.props.stdout
					}}
				>
					{this.props.children}
				</StdoutContext.Provider>
			</StdinContext.Provider>
		);
	}

	componentDidMount() {
		cliCursor.hide(this.props.stdout);
	}

	componentWillUnmount() {
		cliCursor.show(this.props.stdout);
	}

	handleSetRawMode = isEnabled => {
		const {stdin} = this.props;

		stdin.setEncoding('utf8');
		stdin.setRawMode(isEnabled);

		if (isEnabled) {
			stdin.addListener('data', this.handleInput);
		} else {
			stdin.removeListener('data', this.handleInput);
		}
	};

	handleInput = input => {
		// Exit on Ctrl+C
		if (input === '\x03') { // eslint-disable-line unicorn/no-hex-escape
			process.exit(0); // eslint-disable-line unicorn/no-process-exit
		}
	};
}
