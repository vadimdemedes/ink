'use strict';
const React = require('react');
const {render, Box, Color} = require('..');

class Counter extends React.PureComponent {
	constructor() {
		super();

		this.state = {
			i: 0
		};
	}

	render() {
		return React.createElement(
			Box,
			{flexDirection: 'column'},
			React.createElement(Box, {}, React.createElement(Color, {blue: true}, '~/Projects/ink ')),
			React.createElement(
				Box,
				{},
				React.createElement(Color, {red: true}, 'λ '),
				React.createElement(Color, {green: true}, 'node '),
				React.createElement(Box, {}, 'media/example')
			),
			React.createElement(Color, {green: true}, `${this.state.i} tests passed`)
		);
	}

	componentDidMount() {
		this.timer = setInterval(() => {
			if (this.state.i === 50) {
				process.exit(0); // eslint-disable-line unicorn/no-process-exit
			}

			this.setState(prevState => ({
				i: prevState.i + 1
			}));
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}
}

render(React.createElement(Counter));
