import React, {useRef, useState} from 'react';
import {
	render,
	Box,
	Text,
	useInput,
	useApp,
	useBoxMetrics,
} from '../../src/index.js';

function ScrollView({
	height,
	children,
}: {
	readonly height: number;
	readonly children: React.ReactNode;
}) {
	const ref = useRef(null);
	const contentRef = useRef(null);
	const {clientWidth, clientHeight} = useBoxMetrics(ref);
	const content = useBoxMetrics(contentRef);
	const [requestedScrollTop, setRequestedScrollTop] = useState(0);
	const [requestedScrollLeft, setRequestedScrollLeft] = useState(0);
	const maxScrollTop = Math.max(0, content.height - clientHeight);
	const maxScrollLeft = Math.max(0, content.width - clientWidth);

	// Clamp on every render, not just in the key handlers: the maximum shrinks
	// when the content gets shorter or the terminal gets wider, and an offset
	// left over from before would scroll the viewport past its content.
	const scrollTop = Math.min(requestedScrollTop, maxScrollTop);
	const scrollLeft = Math.min(requestedScrollLeft, maxScrollLeft);

	useInput((_input, key) => {
		if (key.upArrow) {
			setRequestedScrollTop(current =>
				Math.max(0, Math.min(current, maxScrollTop) - 1),
			);
		}

		if (key.downArrow) {
			setRequestedScrollTop(current => Math.min(maxScrollTop, current + 1));
		}

		if (key.leftArrow) {
			setRequestedScrollLeft(current =>
				Math.max(0, Math.min(current, maxScrollLeft) - 2),
			);
		}

		if (key.rightArrow) {
			setRequestedScrollLeft(current => Math.min(maxScrollLeft, current + 2));
		}
	});

	return (
		<Box flexDirection="column">
			<Box
				ref={ref}
				height={height}
				overflow="hidden"
				contentOffsetY={scrollTop}
				contentOffsetX={scrollLeft}
				flexDirection="column"
				borderStyle="round"
			>
				{/* flexShrink=0 keeps the content at its natural height, so it can overflow (and scroll) instead of being squeezed into the viewport. The explicit width gives the content a horizontal extent wider than the viewport; without it, text wraps or truncates at the viewport edge and there is nothing to scroll horizontally. */}
				<Box ref={contentRef} flexDirection="column" flexShrink={0} width={140}>
					{children}
				</Box>
			</Box>
			<Text dimColor>
				scrollTop={scrollTop}/{maxScrollTop} scrollLeft={scrollLeft}/
				{maxScrollLeft} client={clientWidth}x{clientHeight} content=
				{content.width}x{content.height} (arrows to scroll, q to quit)
			</Text>
		</Box>
	);
}

function Demo() {
	const {exit} = useApp();

	useInput(input => {
		if (input === 'q') {
			exit();
		}
	});

	return (
		<ScrollView height={10}>
			{Array.from({length: 40}, (_, index) => (
				<Text key={index} wrap="truncate">
					Line {String(index + 1).padStart(2, '0')}{' '}
					{index % 5 === 0
						? `◀ marker ${'·'.repeat(100)} end-of-line-${index + 1} ▶`
						: ''}
				</Text>
			))}
		</ScrollView>
	);
}

render(<Demo />);
