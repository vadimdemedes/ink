import React, {useState} from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	useIsScreenReaderEnabled,
} from '../../src/index.js';

const items = ['Red', 'Green', 'Blue', 'Yellow', 'Magenta', 'Cyan'];

function SelectInput() {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const isScreenReaderEnabled = useIsScreenReaderEnabled();

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(
				previousIndex => (previousIndex - 1 + items.length) % items.length,
			);
		}

		if (key.downArrow) {
			setSelectedIndex(previousIndex => (previousIndex + 1) % items.length);
		}

		if (!isScreenReaderEnabled) {
			return;
		}

		const number = Number(input);
		if (Number.isSafeInteger(number) && number > 0 && number <= items.length) {
			setSelectedIndex(number - 1);
		}
	});

	return (
		<Box flexDirection="column" aria-role="list">
			<Text>Select a color:</Text>
			{items.map((item, index) => {
				const isSelected = index === selectedIndex;
				const label = isSelected ? `> ${item}` : `  ${item}`;
				const screenReaderLabel = `${index + 1}. ${item}`;

				return (
					<Box
						key={item}
						aria-role="listitem"
						aria-state={{selected: isSelected}}
						aria-label={isScreenReaderEnabled ? screenReaderLabel : undefined}
					>
						<Text color={isSelected ? 'blue' : undefined}>{label}</Text>
					</Box>
				);
			})}
		</Box>
	);
}

render(<SelectInput />);
