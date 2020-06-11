'use strict';
const React = require('react');
const PropTypes = require('prop-types');
const {Box, Text, Color} = require('../..');

const Summary = ({isFinished, passed, failed, time}) => (
	<Box flexDirection="column" marginTop={1}>
		<Box>
			<Box width={14}>
				<Color bold>Test Suites:</Color>
			</Box>
			{failed > 0 && (
				<Color bold red>
					{failed} failed,{' '}
				</Color>
			)}
			{passed > 0 && (
				<Color bold green>
					{passed} passed,{' '}
				</Color>
			)}
			<Text>{passed + failed} total</Text>
		</Box>

		<Box>
			<Box width={14}>
				<Color bold>Time:</Color>
			</Box>

			<Text>{time}</Text>
		</Box>

		{isFinished && (
			<Box>
				<Color dim>Ran all test suites.</Color>
			</Box>
		)}
	</Box>
);

Summary.propTypes = {
	isFinished: PropTypes.bool.isRequired,
	passed: PropTypes.number.isRequired,
	failed: PropTypes.number.isRequired,
	time: PropTypes.string.isRequired
};

module.exports = Summary;
