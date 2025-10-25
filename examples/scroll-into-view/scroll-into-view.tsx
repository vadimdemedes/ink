/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
	useState,
	useLayoutEffect,
	useCallback,
	useEffect,
	useRef,
} from 'react';
import {
	Box,
	Text,
	useInput,
	getBoundingBox,
	getInnerHeight,
	type DOMElement,
	Static,
} from '../../src/index.js';

const items = Array.from({length: 100}).map((_, i) => ({
	id: String(i + 1),
	header: `Item ${i}`,
	content: ' - Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}));

type Rect = {
	width: number;
	height: number;
	x: number;
	y: number;
};

function ScrollIntoView() {
	const [selected, setSelected] = useState(10);
	const [log, setLog] = useState<Array<{id: string; text: string}>>([]);
	const [scrollTop, setScrollTop] = useState(10);
	const [container, setContainer] = useState<DOMElement | undefined>(null);
	const [selectedItemNode, setSelectedItemNode] = useState<
		DOMElement | undefined
	>(null);
	const innerReference = useRef<DOMElement>(null);

	const selectedItemCallbackReference = useCallback(
		(node: DOMElement | undefined) => {
			if (node) {
				setSelectedItemNode(node);
			}
		},
		[],
	);

	useInput((_, key) => {
		if (key.upArrow) {
			setSelected(previous => Math.max(0, previous - 1));
		}

		if (key.downArrow) {
			setSelected(previous => Math.min(items.length - 1, previous + 1));
		}
	});

	useEffect(() => {
		setLog(previousLog => [
			...previousLog,
			{
				id: String(previousLog.length + 1),
				text: `Selected item is ${selected}`,
			},
		]);
	}, [selected]);

	useLayoutEffect(() => {
		if (!container || !selectedItemNode || !innerReference.current) {
			return;
		}

		const newContainerRect = getBoundingBox(container);
		const innerRect = getBoundingBox(innerReference.current);
		const borderTop = innerRect.y - newContainerRect.y;
		const innerHeight = getInnerHeight(container);
		const newItemRect = getBoundingBox(selectedItemNode);

		const unscrolledItemY = newItemRect.y - (newContainerRect.y + borderTop);

		const visibleHeight = innerHeight;

		const isAbove = unscrolledItemY < scrollTop;
		const isBelow =
			unscrolledItemY + newItemRect.height > scrollTop + visibleHeight;

		if (isAbove) {
			setScrollTop(unscrolledItemY);
		} else if (isBelow) {
			setScrollTop(unscrolledItemY + newItemRect.height - visibleHeight);
		}
	}, [container, selectedItemNode]);

	// This example uses static to exercise subtle interactions between
	// useLayoutEffect and static rendering.
	return (
		<Box flexDirection="column">
			<Static items={log}>
				{item => (
					<Box key={item.id}>
						<Text>{item.text}</Text>
					</Box>
				)}
			</Static>

			<Box flexDirection="column" padding={1}>
				<Text>Use up/down arrows to scroll. Selected: {selected}</Text>
				<Box
					ref={setContainer}
					borderStyle="round"
					overflowY="scroll"
					height={10}
					flexDirection="column"
					scrollTop={scrollTop}
				>
					<Box
						ref={innerReference}
						flexDirection="column"
						flexShrink={0}
						padding={1}
					>
						{items.map((item, index) => (
							<Box
								key={item.id}
								ref={
									selected === index ? selectedItemCallbackReference : undefined
								}
								flexDirection="column"
							>
								<Text color={selected === index ? 'green' : ''}>
									{item.header}
									{selected === index && ' ***'}
								</Text>
								<Text color={selected === index ? '' : 'gray'}>
									{item.content}
								</Text>
							</Box>
						))}
					</Box>
				</Box>
			</Box>
		</Box>
	);
}

export default ScrollIntoView;
