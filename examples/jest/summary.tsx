import React from 'react';
import {Box, Text} from '../../src/index.js';

function Summary({isFinished, passed, failed, time}) {
	return (
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
}

export default Summary;
