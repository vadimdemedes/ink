import React from 'react';
import {render, Box, Text} from '../../src/index.js';

function JustifyContent() {
	return (
		<Box flexDirection="column">
			<Box>
				<Text>[</Text>
				<Box justifyContent="flex-start" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
			<Box>
				<Text>[</Text>
				<Box justifyContent="flex-end" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
			<Box>
				<Text>[</Text>
				<Box justifyContent="center" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
			<Box>
				<Text>[</Text>
				<Box justifyContent="space-around" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
			<Box>
				<Text>[</Text>
				<Box justifyContent="space-between" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
			<Box>
				<Text>[</Text>
				<Box justifyContent="space-evenly" width={20} height={1}>
					<Text>X</Text>
					<Text>Y</Text>
				</Box>
				<Text>]</Text>
			</Box>
		</Box>
	);
}

render(<JustifyContent />);
