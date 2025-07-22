import React from 'react';
import {render, Box, Text} from '../../src/index.js';

function Borders() {
	return (
<Box accessibilityRole="button">
	<Text>Save</Text>
</Box>
	);
}

render(<Borders />);
