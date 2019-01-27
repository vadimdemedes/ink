'use strict';
const React = require('react');
const {Box, Color, render} = require('..');

const Test = () => (
	<Box flexDirection="column">
		<Box>
			<Color bgYellow black>
				{' Woot '}
			</Color>

			<Box marginLeft={1}>
			path
			</Box>
		</Box>
	</Box>
);

render(<Test/>, {debug: false});
