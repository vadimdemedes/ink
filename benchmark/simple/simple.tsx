#!/usr/bin/env npx ts-node-esm

/* eslint-disable react/jsx-curly-brace-presence */
import {createRequire} from 'node:module';
import React from 'react';
import {render, Box, Text} from '../../src/index.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const Benchmark: any = require('benchmark');

function App() {
	return (
		<Box flexDirection="column" padding={1}>
			<Text underline bold color="red">
				{'Hello'} {'World'}
			</Text>

			<Box marginTop={1} width={60}>
				<Text>
					Cupcake ipsum dolor sit amet candy candy. Sesame snaps cookie I love
					tootsie roll apple pie bonbon wafer. Caramels sesame snaps icing
					cotton candy I love cookie sweet roll. I love bonbon sweet.
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
}

const stdout: any = {
	write() {
		// Noop
	},
	on() {
		// Noop
	},
	off() {
		// Noop
	}
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const {rerender} = render(<App />, {stdout});
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const suite = new Benchmark.Suite();

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
suite
	.add('test', () => {
		rerender(<App />);
	})
	.on('cycle', event => {
		console.log(String(event.target));
	})
	.run();
