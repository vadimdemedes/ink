/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import React, {useState, useRef, useEffect} from 'react';
import {Box, Text, useInput, type DOMElement} from '../../src/index.js';

const items = Array.from({length: 1000}).map((_, i) => ({
	id: i,
	text: `Line ${i} - ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
		(i * 5) % 6,
	)}`,
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

function ScrollableContent() {
	const [showBorder, setShowBorder] = useState(true);
	const [scrollTop, setScrollTop] = useState(0);
	const {columns, rows} = useTerminalSize();

	useInput((input, key) => {
		if (input === ' ') {
			setShowBorder(b => !b);
		}

		if (key.upArrow) {
			setScrollTop(s => Math.max(0, s - 1));
		}

		if (key.downArrow) {
			setScrollTop(s => s + 1);
		}
	});

	return (
		<Box flexDirection="column" height={rows - 2} width={columns}>
			<Box flexDirection="column" flexShrink={0} overflow="hidden">
				<Text>
					This is a demo showing a scrollable box with sticky headers.
				</Text>
				<Text>Press up/down arrow to scroll vertically.</Text>
				<Text>Press 'space' to toggle border.</Text>
			</Box>
			<Box
				borderStyle={showBorder ? 'round' : undefined}
				flexShrink={0}
				width={
					showBorder ? Math.floor(columns * 0.8) : Math.floor(columns * 0.8) - 2
				}
				height={showBorder ? rows - 10 : rows - 12}
				flexDirection="column"
				overflowX="hidden"
				overflowY="scroll"
				paddingRight={0}
				scrollTop={scrollTop}
			>
				<Box flexDirection="column" flexShrink={0}>
					<Box>
						<Text>Line 1</Text>
					</Box>
					{(() => {
						const elements = [];
						for (let i = 0; i < items.length; i += 20) {
							const headerIndex = i;
							const headerId = headerIndex / 20;
							const headerText = `Header ${headerId}`;
							const stickyHeaderText = `Header ${headerId} (sticky)`;

							const itemsInGroup = items.slice(headerIndex, headerIndex + 10);
							const nextItems = items.slice(headerIndex + 10, headerIndex + 20);

							elements.push(
								<Box key={`group-${headerId}`} flexDirection="column">
									<Box
										sticky
										width="100%"
										stickyChildren={
											<Box
												opaque
												borderBottom
												flexDirection="column"
												width="100%"
												paddingLeft={1}
												borderStyle="round"
												borderColor="#000000"
												paddingX={0}
												borderTop={false}
												borderLeft={false}
												borderRight={false}
											>
												<Text>{stickyHeaderText}</Text>
											</Box>
										}
									>
										<Box
											flexDirection="column"
											width="100%"
											paddingLeft={1}
											paddingX={0}
										>
											<Text>{headerText}</Text>
										</Box>
									</Box>
									{itemsInGroup.map(item => (
										<Box key={item.id} paddingLeft={1}>
											<Text color="#999999">{item.text}</Text>
										</Box>
									))}
									<Box paddingLeft={1}>
										<Text>last element matching header</Text>
									</Box>
								</Box>,
								...nextItems.map(item => (
									<Box key={item.id} flexDirection="column" paddingLeft={1}>
										<Text key={item.id} color="#999999">
											{item.text}
										</Text>
									</Box>
								)),
							);
						}

						return elements;
					})()}
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
