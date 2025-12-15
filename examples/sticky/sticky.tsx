import React, {useRef, useState} from 'react';
import {render, Box, Text, useInput, type BoxRef} from '../../src/index.js';

const sections = [
	{name: 'Section A', items: 8},
	{name: 'Section B', items: 6},
	{name: 'Section C', items: 10},
	{name: 'Section D', items: 5},
];

function StickyExample() {
	const boxReference = useRef<BoxRef>(null);
	const [scrollY, setScrollY] = useState(0);

	useInput((input, key) => {
		if (key.downArrow) {
			const newY = scrollY + 1;
			setScrollY(newY);
			boxReference.current?.scrollTo({y: newY});
		} else if (key.upArrow) {
			const newY = Math.max(0, scrollY - 1);
			setScrollY(newY);
			boxReference.current?.scrollTo({y: newY});
		} else if (key.pageDown) {
			const newY = scrollY + 5;
			setScrollY(newY);
			boxReference.current?.scrollTo({y: newY});
		} else if (key.pageUp) {
			const newY = Math.max(0, scrollY - 5);
			setScrollY(newY);
			boxReference.current?.scrollTo({y: newY});
		} else if (input === 'g') {
			boxReference.current?.scrollToTop();
			setScrollY(0);
		} else if (input === 'G') {
			boxReference.current?.scrollToBottom();
			const pos = boxReference.current?.getScrollPosition();
			if (pos) setScrollY(pos.y);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Sticky Headers Demo - Scroll: {scrollY}</Text>
			<Text dimColor>↑/↓ scroll, PageUp/Down, g/G for top/bottom</Text>

			<Box marginTop={1}>
				<Box
					ref={boxReference}
					width={40}
					height={12}
					overflow="scroll"
					borderStyle="round"
					flexDirection="column"
				>
					{sections.map(section => (
						<Box key={section.name} flexDirection="column">
							<Box position="sticky" top={0} flexShrink={0}>
								<Text bold inverse>
									{' '}
									{section.name.padEnd(36)}{' '}
								</Text>
							</Box>

							{Array.from({length: section.items}, (_, i) => (
								<Box key={i} flexShrink={0} paddingLeft={1}>
									<Text>
										{section.name} - Item {i + 1}
									</Text>
								</Box>
							))}
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
}

render(<StickyExample />);
