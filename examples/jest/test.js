'use strict';
const React = require('react');
const PropTypes = require('prop-types');
const {Box, Text} = require('../..');

const getBackgroundForStatus = status => {
	switch (status) {
		case 'runs':
			return 'yellow';
		case 'pass':
			return 'green';
		case 'fail':
			return 'red';
		default:
			return undefined;
	}
};

const Test = ({status, path}) => (
	<Box>
		<Text color="black" backgroundColor={getBackgroundForStatus(status)}>
			{` ${status.toUpperCase()} `}
		</Text>

		<Box marginLeft={1}>
			<Text dimColor>{path.split('/')[0]}/</Text>

			<Text bold color="white">
				{path.split('/')[1]}
			</Text>
		</Box>
	</Box>
);

Test.propTypes = {
	status: PropTypes.string.isRequired,
	path: PropTypes.string.isRequired
};

module.exports = Test;
