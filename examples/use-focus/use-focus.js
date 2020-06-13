/* eslint-disable react/prop-types */
'use strict';
const React = require('react');
const {render, Box, Text, Color, useFocus} = require('../..');

const Focus = () => (
	<Box flexDirection="column" padding={1}>
		<Box marginBottom={1}>
			Press Tab to focus next element, Shift+Tab to focus previous element, Esc
			to reset focus.
		</Box>
		<Item label="First" />
		<Item label="Second" />
		<Item label="Third" />
	</Box>
);

const Item = ({label}) => {
	const {isFocused} = useFocus();
	return (
		<Text>
			{label} {isFocused && <Color green>(focused)</Color>}
		</Text>
	);
};

render(<Focus />);
