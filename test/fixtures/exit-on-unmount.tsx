import React from 'react';
import {render, Text} from '../../src/index.js';

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

setTimeout(() => {
	app.unmount();
}, 500);

await app.waitUntilExit();
console.log('exited');
