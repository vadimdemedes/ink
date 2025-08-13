import React, {useState} from 'react';
import {render, Text, Box, useInput} from 'ink';

function AriaExample() {
	const [checked, setChecked] = useState(false);

	useInput(key => {
		if (key === ' ') {
			setChecked(!checked);
		}
	});

	return (
		<Box flexDirection="column">
			<Text>
				Press spacebar to toggle the checkbox. This example is best experienced
				with a screen reader.
			</Text>
			<Box marginTop={1}>
				<Box aria-role="checkbox" aria-state={{checked}}>
					<Text>{checked ? '[x]' : '[ ]'}</Text>
				</Box>
			</Box>
			<Box marginTop={1}>
				<Text aria-hidden="true">This text is hidden from screen readers.</Text>
			</Box>
		</Box>
	);
}

render(<AriaExample />);
