import React from 'react';
import {render, Box, Text} from '../../src/index.js';

function BorderBackgrounds() {
	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="round"
				borderColor="white"
				borderBackgroundColor="blue"
				padding={1}
			>
				<Text>Box with blue background on white border</Text>
			</Box>

			<Box
				borderStyle="single"
				borderColor="black"
				borderBackgroundColor="yellow"
				padding={1}
			>
				<Text>Box with yellow background on black border</Text>
			</Box>

			<Box
				borderStyle="double"
				borderTopColor="red"
				borderTopBackgroundColor="green"
				borderBottomColor="blue"
				borderBottomBackgroundColor="yellow"
				borderLeftColor="cyan"
				borderLeftBackgroundColor="magenta"
				borderRightColor="white"
				borderRightBackgroundColor="red"
				padding={1}
			>
				<Text>Box with different colors per side</Text>
			</Box>

			<Box
				borderBackgroundDimColor
				borderBackgroundColor="rgb(128, 0, 128)"
				borderStyle="classic"
				borderColor="white"
				padding={1}
			>
				<Text>Box with RGB purple dimmed background on border</Text>
			</Box>

			<Box
				borderStyle="bold"
				borderColor="#FF00FF"
				borderBackgroundColor="#00FF00"
				padding={1}
			>
				<Text>Box with hex color backgrounds</Text>
			</Box>
		</Box>
	);
}

render(<BorderBackgrounds />);
