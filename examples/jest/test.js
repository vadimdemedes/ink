'use strict';
const React = require('react');
const {Box, Color} = require('../..');

const getBackgroundForStatus = status => {
	if (status === 'runs') {
		return {
			bgYellow: true,
			black: true
		};
	}

	if (status === 'pass') {
		return {
			bgGreen: true,
			black: true
		};
	}

	if (status === 'fail') {
		return {
			bgRed: true,
			black: true
		};
	}
};

const Test = ({ status, path }) => (
	<Box>
		<Color {...getBackgroundForStatus(status)}>
			{` ${status.toUpperCase()} `}
		</Color>

		<Box marginLeft={1}>
			<Color dim>
				{path.split('/')[0]}/
			</Color>

			<Color bold white>
				{path.split('/')[1]}
			</Color>
		</Box>
	</Box>
);

module.exports = Test;
