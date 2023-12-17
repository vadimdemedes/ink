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
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1,
			}));

			this.timer = setTimeout(onTimeout, 100);
		};

		this.timer = setTimeout(onTimeout, 100);
	}

	override componentWillUnmount() {
		clearTimeout(this.timer);
	}
}

render(<Test />);
