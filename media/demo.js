import process from 'node:process';
import React from 'react';
import {render, Box, Text} from 'ink';

class Counter extends React.PureComponent {
	constructor() {
		super();

		this.state = {
			i: 0,
		};
	}

	render() {
		return React.createElement(
			Box,
			{flexDirection: 'column'},
			React.createElement(
				Box,
				{},
				React.createElement(Text, {color: 'blue'}, '~/Projects/ink '),
			),
			React.createElement(
				Box,
				{},
				React.createElement(Text, {color: 'magenta'}, '❯ '),
				React.createElement(Text, {color: 'green'}, 'node '),
				React.createElement(Text, {}, 'media/example'),
			),
			React.createElement(
				Text,
				{color: 'green'},
				`${this.state.i} tests passed`,
			),
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			if (this.state.i === 50) {
				process.exit(0); // eslint-disable-line unicorn/no-process-exit
			}

			this.setState(previousState => ({
				i: previousState.i + 1,
			}));
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

render(React.createElement(Counter));
