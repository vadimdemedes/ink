import React from 'react';
import {render, Static, Box} from '../../src';

interface TestState {
	counter: number;
	items: string[];
}

class Test extends React.Component<Record<string, unknown>, TestState> {
	timer: NodeJS.Timeout;

	state: TestState = {
		items: [],
		counter: 0
	};

	render() {
		return (
			<>
				<Static>
					{this.state.items.map(item => (
						<Box key={item}>{item}</Box>
					))}
				</Static>

				<Box>Counter: {this.state.counter}</Box>
			</>
		);
	}

	componentDidMount() {
		const onTimeout = () => {
			if (this.state.counter > 4) {
				return;
			}

			this.setState(prevState => ({
				counter: prevState.counter + 1,
				items: [...prevState.items, `#${prevState.counter + 1}`]
			}));

			this.timer = setTimeout(onTimeout, 100);
		};

		this.timer = setTimeout(onTimeout, 100);
	}

	componentWillUnmount() {
		clearTimeout(this.timer);
	}
}

render(<Test/>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});
