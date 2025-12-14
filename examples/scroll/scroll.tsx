import React, {useRef, useState, useCallback} from 'react';
import {Box, Text, useInput, type BoxRef} from '../../src/index.js';

const items = Array.from({length: 30}, (_, i) => `Item ${i + 1}`);

function ScrollExample() {
	const boxReference = useRef<BoxRef>(null);
	const [scrollTop, setScrollTop] = useState(0);

	const containerHeight = 10;
	const contentHeight = items.length;
	const maxScroll = Math.max(0, contentHeight - containerHeight);

	const scrollBy = useCallback(
		(delta: number) => {
			setScrollTop(previous => {
				const next = Math.max(0, Math.min(maxScroll, previous + delta));
				boxReference.current?.scrollTo({x: 0, y: next});
				return next;
			});
		},
		[maxScroll],
	);

	const scrollToTop = useCallback(() => {
		setScrollTop(0);
		boxReference.current?.scrollTo({x: 0, y: 0});
	}, []);

	const scrollToBottom = useCallback(() => {
		setScrollTop(maxScroll);
		boxReference.current?.scrollTo({x: 0, y: maxScroll});
	}, [maxScroll]);

	useInput((input, key) => {
		if (key.downArrow) {
			scrollBy(1);
		} else if (key.upArrow) {
			scrollBy(-1);
		} else if (key.pageDown) {
			scrollBy(10);
		} else if (key.pageUp) {
			scrollBy(-10);
		} else if (input === 'g') {
			scrollToTop();
		} else if (input === 'G') {
			scrollToBottom();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>
				Scrollable List - Scroll: {scrollTop}/{maxScroll}
			</Text>
			<Text dimColor>Use arrow keys, PageUp/Down, g/G</Text>

			<Box marginTop={1}>
				<Box
					ref={boxReference}
					width={30}
					height={containerHeight}
					overflow="scroll"
					borderStyle="round"
					flexDirection="column"
				>
					{items.map(item => (
						<Box key={item} flexShrink={0}>
							<Text>{item}</Text>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
}

export default ScrollExample;
