import React from 'react';
import {render, Box, Text} from '../../src/index.js';
import {Pager} from '../../src/components/Pager.js';

const manyItems = Array.from({length: 25}, (_, i) => (
	<Text key={i}>Item {i + 1}</Text>
));

function PagerExample() {
	return (
		<Box flexDirection="column">
			<Text>A paginatable list of items:</Text>
			<Pager pageHeight={5}>{manyItems}</Pager>
		</Box>
	);
}

render(<PagerExample />);
