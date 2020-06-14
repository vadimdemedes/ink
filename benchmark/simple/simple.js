/* eslint-disable react/jsx-curly-brace-presence */
'use strict';
const React = require('react');
const {render, Box, Text} = require('../..');
const Benchmark = require('benchmark');

const App = () => (
	<Box flexDirection="column" padding={1}>
		<Text underline bold color="red">
			{'Hello'} {'World'}
		</Text>

		<Box marginTop={1} width={60}>
			<Text>
				Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love
				tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing cotton
				candy I love cookie sweet roll. I love bonbon sweet.
			</Text>
		</Box>

		<Box marginTop={1} flexDirection="column">
			<Text backgroundColor="white" color="black">
				Colors:
			</Text>

			<Box flexDirection="column" paddingLeft={1}>
				<Text>
					- <Text color="red">Red</Text>
				</Text>
				<Text>
					- <Text color="blue">Blue</Text>
				</Text>
				<Text>
					- <Text color="green">Green</Text>
				</Text>
			</Box>
		</Box>
	</Box>
);

const stdout = {
	write() {}
};

const {rerender} = render(<App />, {stdout});
const suite = new Benchmark.Suite();

suite
	.add('test', () => {
		rerender(<App />);
	})
	.on('cycle', event => {
		console.log(String(event.target));
	})
	.run();
