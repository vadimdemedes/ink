import React from 'react';
import {render, Text} from '../../src';

class Test extends React.Component<Record<string, unknown>, {counter: number}> {
	timer?: NodeJS.Timeout;

	state = {
		counter: 0
	};

	render() {
		return <Text>Counter: {this.state.counter}</Text>;
	}

	componentDidMount() {
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

const app = render(<Test />);
setTimeout(() => app.unmount(), 500);
app.waitUntilExit().then(() => console.log('exited'));
