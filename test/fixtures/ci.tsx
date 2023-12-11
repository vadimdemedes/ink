import React from 'react';
import {render, Static, Text} from '../../src/index.js';

type TestState = {
	counter: number;
	items: string[];
};

class Test extends React.Component<Record<string, unknown>, TestState> {
	timer?: NodeJS.Timeout;

	override state: TestState = {
		items: [],
		counter: 0,
	};

	override render() {
		return (
			<>
				<Static items={this.state.items}>
					{item => <Text key={item}>{item}</Text>}
				</Static>

				<Text>Counter: {this.state.counter}</Text>
			</>
		);
	}

	override componentDidMount() {
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1,
				items: [...prevState.items, `#${prevState.counter + 1}`],
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
