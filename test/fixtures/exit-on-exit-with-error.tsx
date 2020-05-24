import React from 'react';
import {render, Box, useApp} from '../../src';

class Exit extends React.Component<
	{onExit: (error: Error) => void},
	{counter: number}
> {
	timer?: NodeJS.Timeout;

	state = {
		counter: 0
	};

	render() {
		return <Box>Counter: {this.state.counter}</Box>;
	}

	componentDidMount() {
		setTimeout(() => this.props.onExit(new Error('errored')), 500);

		this.timer = setInterval(() => {
			this.setState(prevState => ({
				counter: prevState.counter + 1
			}));
		}, 100);
	}

	componentWillUnmount() {
		clearInterval(this.timer!);
	}
}

const Test = () => {
	const {exit} = useApp();
	return <Exit onExit={exit} />;
};

const app = render(<Test />);
app.waitUntilExit().catch((error: Error) => console.log(error.message));
