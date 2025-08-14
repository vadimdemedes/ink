import React, {useState} from 'react';
import {render, Text, Box, useInput, useIsScreenReaderEnabled} from 'ink';

const items = ['Red', 'Green', 'Blue', 'Yellow', 'Magenta', 'Cyan'];

function SelectInput() {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const isScreenReaderEnabled = useIsScreenReaderEnabled();

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(previousIndex =>
				previousIndex === 0 ? items.length - 1 : previousIndex - 1,
			);
		}

		if (key.downArrow) {
			setSelectedIndex(previousIndex =>
				previousIndex === items.length - 1 ? 0 : previousIndex + 1,
			);
		}

		if (isScreenReaderEnabled) {
			const number = Number.parseInt(input, 10);
			if (!Number.isNaN(number) && number > 0 && number <= items.length) {
				setSelectedIndex(number - 1);
			}
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
