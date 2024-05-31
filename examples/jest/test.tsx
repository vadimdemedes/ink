import React from 'react';
import {Box, Text} from '../../src/index.js';

const getBackgroundForStatus = (status: string): string | undefined => {
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

type Properties = {
	readonly status: string;
	readonly path: string;
};

function Test({status, path}: Properties) {
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
