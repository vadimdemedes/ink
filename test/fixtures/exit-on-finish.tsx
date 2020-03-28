import React from 'react';
import {render, Box} from '../../src';

class Test extends React.Component<Record<string, unknown>, {counter: number}> {
	timer?: NodeJS.Timeout;

	state = {
		counter: 0
	};

	render() {
		return (
			<Box>Counter: {this.state.counter}</Box>
		);
	}

	componentDidMount() {
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1
			}));

			this.timer = setTimeout(onTimeout, 100);
		};

		this.timer = setTimeout(onTimeout, 100);
	}

	componentWillUnmount() {
		clearTimeout(this.timer!);
	}
}

render(<Test/>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});
