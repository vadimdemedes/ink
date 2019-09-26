'use strict';
const {useState, useContext} = require('react');
const React = require('react');
const {render, useInput, Box, AppContext} = require('../..');

const Robot = () => {
	const {exit} = useContext(AppContext);
	const [x, setX] = useState(1);
	const [y, setY] = useState(1);

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (key.leftArrow) {
			setX(Math.max(1, x - 1));
		}

		if (key.rightArrow) {
			setX(Math.min(20, x + 1));
		}

		if (key.upArrow) {
			setY(Math.max(1, y - 1));
		}

		if (key.downArrow) {
			setY(Math.min(10, y + 1));
		}
	});

	return (
		<Box flexDirection="column">
			<Box>Use arrow keys to move the face. Press “q” to exit.</Box>
			<Box height={12} paddingLeft={x} paddingTop={y}>^_^</Box>
		</Box>
	);
};

render(<Robot/>);
