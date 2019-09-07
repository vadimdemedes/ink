'use strict';
const {useState} = require('react');
const React = require('react');
const {render, useKeypress, Box} = require('../..');

const {exit} = process;

const Robot = () => {
	const [x, setX] = useState(1);
	const [y, setY] = useState(1);

	useKeypress(key => {
		switch (key) {
			case 'h':
				setX(Math.max(1, x - 1));
				break;
			case 'l':
				setX(Math.min(80, x + 1));
				break;
			case 'j':
				setY(Math.min(40, y + 1));
				break;
			case 'k':
				setY(Math.max(1, y - 1));
				break;
			case 'q':
				exit();
				break;
			default:
				break;
		}
	});

	return (
		<Box flexDirection="column">
			<Box>Use h, j, k, and l to move the face. q to exit</Box>
			<Box marginTop={y} marginLeft={x}>^_^</Box>
		</Box>
	);
};

render(<Robot/>);
