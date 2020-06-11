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

render(<Test />);
