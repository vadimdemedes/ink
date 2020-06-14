'use strict';
const React = require('react');
const PropTypes = require('prop-types');
const {Box, Text} = require('../..');

const Summary = ({isFinished, passed, failed, time}) => (
	<Box flexDirection="column" marginTop={1}>
		<Box>
			<Box width={14}>
				<Text bold>Test Suites:</Text>
			</Box>
			{failed > 0 && (
				<Text bold color="red">
					{failed} failed,{' '}
				</Text>
			)}
			{passed > 0 && (
				<Text bold color="green">
					{passed} passed,{' '}
				</Text>
			)}
			<Text>{passed + failed} total</Text>
		</Box>

		<Box>
			<Box width={14}>
				<Text bold>Time:</Text>
			</Box>

			<Text>{time}</Text>
		</Box>

		{isFinished && (
			<Box>
				<Text dimColor>Ran all test suites.</Text>
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
