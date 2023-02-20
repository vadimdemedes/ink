import React from 'react';
import {render, Box, Text, useFocus, useInput, useFocusManager} from 'ink';
import PropTypes from 'prop-types';

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

function Item({label, id}) {
	const {isFocused} = useFocus({id});

	return (
		<Text>
			{label} {isFocused && <Text color="green">(focused)</Text>}
		</Text>
	);
}

Item.propTypes = {
	label: PropTypes.string,
	id: PropTypes.string.isRequired
};

render(<Focus />);
