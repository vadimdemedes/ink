'use strict';
const React = require('react');
const {Box, Text, render} = require('../..');

const Erase = () => (
	<Box flexDirection="column">
		<Text>A</Text>
		<Text>B</Text>
		<Text>C</Text>
	</Box>
);

process.stdout.rows = Number(process.argv[3]);
render(<Erase/>, {experimental: true});
