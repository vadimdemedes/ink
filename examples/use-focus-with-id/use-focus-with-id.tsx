import React from 'react';
import {
	render,
	Box,
	Text,
	useFocus,
	useInput,
	useFocusManager,
} from '../../src/index.js';

function Focus() {
	const {focus} = useFocusManager();

	useInput(input => {
		if (input === '1') {
			focus('1');
		}

		if (input === '2') {
			focus('2');
		}

		if (input === '3') {
			focus('3');
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text>
					Press Tab to focus next element, Shift+Tab to focus previous element,
					Esc to reset focus.
				</Text>
			</Box>
			<Item id="1" label="Press 1 to focus" />
			<Item id="2" label="Press 2 to focus" />
			<Item id="3" label="Press 3 to focus" />
		</Box>
	);
}

type ItemProperties = {
	readonly id: number;
	readonly label: string;
};

function Item({label, id}: ItemProperties) {
	const {isFocused} = useFocus({id});

	return (
		<Text>
			{label} {isFocused && <Text color="green">(focused)</Text>}
		</Text>
	);
}

render(<Focus />);
