import React from 'react';
import {render, Text, useApp} from '../../src';

class Exit extends React.Component<
	{onExit: (error: Error) => void},
	{counter: number}
> {
	timer?: NodeJS.Timeout;

	state = {
		counter: 0
	};

	render() {
		return <Text>Counter: {this.state.counter}</Text>;
	}

	componentDidMount() {
		setTimeout(this.props.onExit, 500);

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
app.waitUntilExit().then(() => console.log('exited'));
