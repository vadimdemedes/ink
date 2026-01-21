import React from 'react';
import {render, Text} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

class Test extends React.Component<Record<string, unknown>, {counter: number}> {
	timer?: NodeJS.Timeout;

	override state = {
		counter: 0,
	};

	override render() {
		return <Text>Counter: {this.state.counter}</Text>;
	}

	override componentDidMount() {
		this.timer = setInterval(() => {
			this.setState(prevState => ({
				counter: prevState.counter + 1,
			}));
		}, 100);
	}

	override componentWillUnmount() {
		clearInterval(this.timer);
	}
}

const app = render(<Test />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

setTimeout(() => {
	app.unmount();
}, 500);

await app.waitUntilExit();
console.log('exited');
