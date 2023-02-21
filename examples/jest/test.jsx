import React from 'react';
import {Box, Text} from 'ink';

const getBackgroundForStatus = status => {
	switch (status) {
		case 'runs': {
			return 'yellow';
		}

		case 'pass': {
			return 'green';
		}

		case 'fail': {
			return 'red';
		}

		default: {
			return undefined;
		}
	}
};

function Test({status, path}) {
	return (
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
}

export default Test;
