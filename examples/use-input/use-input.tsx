import React from 'react';
import {render, useInput, useApp, Box, Text} from '../../src/index.js';

function Robot() {
	const {exit} = useApp();
	const [x, setX] = React.useState(1);
	const [y, setY] = React.useState(1);

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (key.leftArrow) {
			setX(current => Math.max(1, current - 1));
		}

		if (key.rightArrow) {
			setX(current => Math.min(20, current + 1));
		}

		if (key.upArrow) {
			setY(current => Math.max(1, current - 1));
		}

		if (key.downArrow) {
			setY(current => Math.min(10, current + 1));
		}
	});

	return (
		<Box flexDirection="column">
			<Text>Use arrow keys to move the face. Press “q” to exit.</Text>
			<Box height={12} paddingLeft={x} paddingTop={y}>
				<Text>^_^</Text>
			</Box>
		</Box>
	);
}

render(<Robot />);
