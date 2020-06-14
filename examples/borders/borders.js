'use strict';
const React = require('react');
const {render, Box, Text} = require('../..');

const Borders = () => (
	<Box flexDirection="column" padding={2}>
		<Box>
			<Box borderStyle="single" marginRight={2}>
				<Text>single</Text>
			</Box>

			<Box borderStyle="double" marginRight={2}>
				<Text>double</Text>
			</Box>

			<Box borderStyle="round" marginRight={2}>
				<Text>round</Text>
			</Box>

			<Box borderStyle="bold">
				<Text>bold</Text>
			</Box>
		</Box>

		<Box marginTop={1}>
			<Box borderStyle="singleDouble" marginRight={2}>
				<Text>singleDouble</Text>
			</Box>

			<Box borderStyle="doubleSingle" marginRight={2}>
				<Text>doubleSingle</Text>
			</Box>

			<Box borderStyle="classic">
				<Text>classic</Text>
			</Box>
		</Box>
	</Box>
);

render(<Borders />);
