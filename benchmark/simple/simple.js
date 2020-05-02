/* eslint-disable react/jsx-curly-brace-presence */
'use strict';
const React = require('react');
const {render, Box, Color, Text} = require('../..');
const Benchmark = require('benchmark');

const App = () => (
	<Box flexDirection="column" padding={1}>
		<Text underline bold>
			<Color red>
				{'Hello'} {'World'}
			</Color>
		</Text>

		<Box marginTop={1} width={60}>
			Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love
			tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing cotton
			candy I love cookie sweet roll. I love bonbon sweet.
		</Box>

		<Box marginTop={1} flexDirection="column">
			<Color bgWhite black>
				Colors:
			</Color>

			<Box flexDirection="column" paddingLeft={1}>
				<Text>
					- <Color red>Red</Color>
				</Text>
				<Text>
					- <Color blue>Blue</Color>
				</Text>
				<Text>
					- <Color green>Green</Color>
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
