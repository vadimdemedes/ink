/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import React, {useState, useRef, useEffect, useLayoutEffect} from 'react';
import {
	Box,
	Text,
	useInput,
	getInnerHeight,
	getInnerWidth,
	getScrollHeight,
	getScrollWidth,
	type DOMElement,
} from '../../src/index.js';

type ScrollMode = 'vertical' | 'horizontal' | 'both' | 'hidden';

const items = Array.from({length: 100}).map((_, i) => ({
	id: i,
	text: `Line ${i} ${'-'.repeat(i)}`,
}));

export function useTerminalSize(): {columns: number; rows: number} {
	const [size, setSize] = useState({
		columns: process.stdout.columns || 80,
		rows: process.stdout.rows || 20,
	});

	useEffect(() => {
		const updateSize = () => {
			setSize({
				columns: process.stdout.columns || 80,
				rows: process.stdout.rows || 20,
			});
		};

		process.stdout.on('resize', updateSize);

		return () => {
			process.stdout.off('resize', updateSize);
		};
	}, []);

	return size;
}

const scrollModes: ScrollMode[] = ['vertical', 'horizontal', 'both', 'hidden'];

function ScrollableContent() {
	const [scrollMode, setScrollMode] = useState<ScrollMode>('vertical');
	const [scrollTop, setScrollTop] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const reference = useRef<DOMElement>(null);
	const {columns, rows} = useTerminalSize();
	const [size, setSize] = useState({
		innerHeight: 0,
		scrollHeight: 0,
		innerWidth: 0,
		scrollWidth: 0,
	});

	const sizeReference = useRef(size);
	useEffect(() => {
		sizeReference.current = size;
	}, [size]);

	const scrollIntervalReference = useRef<NodeJS.Timeout | undefined>(null);

	useEffect(() => {
		return () => {
			if (scrollIntervalReference.current) {
				clearInterval(scrollIntervalReference.current);
			}
		};
	}, []);

	useLayoutEffect(() => {
		if (reference.current) {
			const innerHeight = getInnerHeight(reference.current);
			const innerWidth = getInnerWidth(reference.current);
			const scrollHeight = getScrollHeight(reference.current);
			const scrollWidth = getScrollWidth(reference.current);

			if (
				size.innerHeight !== innerHeight ||
				size.scrollHeight !== scrollHeight ||
				size.innerWidth !== innerWidth ||
				size.scrollWidth !== scrollWidth
			) {
				setSize({innerHeight, scrollHeight, innerWidth, scrollWidth});
			}
		}
	});

	useInput((input, key) => {
		if (input === 'm') {
			setScrollMode(previousMode => {
				const currentIndex = scrollModes.indexOf(previousMode);
				const nextIndex = (currentIndex + 1) % scrollModes.length;
				return scrollModes[nextIndex]!;
			});
			return;
		}

		if (!key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow) {
			return;
		}

		if (scrollIntervalReference.current) {
			clearInterval(scrollIntervalReference.current);
		}

		const scroll = (
			setter: React.Dispatch<React.SetStateAction<number>>,
			getNewValue: (current: number) => number,
		) => {
			let frame = 0;
			const frames = 10;
			scrollIntervalReference.current = setInterval(() => {
				if (frame < frames) {
					setter(s => getNewValue(s));
					frame++;
				} else if (scrollIntervalReference.current) {
					clearInterval(scrollIntervalReference.current);
					scrollIntervalReference.current = null;
				}
			}, 16);
		};

		if (key.upArrow) {
			scroll(setScrollTop, s => Math.max(0, s - 1));
		}

		if (key.downArrow) {
			scroll(setScrollTop, s =>
				Math.min(
					s + 1,
					Math.max(
						0,
						sizeReference.current.scrollHeight -
							sizeReference.current.innerHeight,
					),
				),
			);
		}

		if (key.leftArrow) {
			scroll(setScrollLeft, s => Math.max(0, s - 1));
		}

		if (key.rightArrow) {
			scroll(setScrollLeft, s =>
				Math.min(
					s + 1,
					Math.max(
						0,
						sizeReference.current.scrollWidth -
							sizeReference.current.innerWidth,
					),
				),
			);
		}
	});

	const overflowX =
		scrollMode === 'horizontal' || scrollMode === 'both' ? 'scroll' : 'hidden';
	const overflowY =
		scrollMode === 'vertical' || scrollMode === 'both' ? 'scroll' : 'hidden';

	return (
		<Box flexDirection="column" height={rows - 2} width={columns}>
			<Box flexDirection="column" flexShrink={0} overflow="hidden">
				<Text>This is a demo showing a scrollable box.</Text>
				<Text>Press up/down arrow to scroll vertically.</Text>
				<Text>Press left/right arrow to scroll horizontally.</Text>
				<Text>
					Press 'm' to cycle through scroll modes (current: {scrollMode})
				</Text>
				<Text>ScrollTop: {scrollTop}</Text>
				<Text>ScrollLeft: {scrollLeft}</Text>
				<Text>
					Size: {size.innerWidth}x{size.innerHeight}
				</Text>
				<Text>
					Inner scrollable size: {size.scrollWidth}x{size.scrollHeight}
				</Text>
			</Box>
			<Box
				ref={reference}
				borderStyle="round"
				flexShrink={1}
				width="80%"
				flexDirection="column"
				overflowX={overflowX}
				overflowY={overflowY}
				paddingRight={1}
				scrollTop={scrollTop}
				scrollLeft={scrollLeft}
			>
				<Box
					flexDirection="column"
					flexShrink={0}
					paddingLeft={1}
					width={
						scrollMode === 'horizontal' || scrollMode === 'both' ? 120 : 'auto'
					}
				>
					{items.map(item => (
						<Text key={item.id}>{item.text}</Text>
					))}
					<Text key="last-line" color="yellow">
						This is the last line.
					</Text>
				</Box>
			</Box>
			<Box flexShrink={0} overflow="hidden">
				<Text>Example footer</Text>
			</Box>
		</Box>
	);
}

export default ScrollableContent;
