import React from 'react';
import {render, measureElement, Box, Text, useInput} from '../../src/index.js';
import ansiEscapes from 'ansi-escapes';

const reducer = (state, action) => {
	switch (action.type) {
		case 'SET_INNER_HEIGHT':
			return {
				...state,
				innerHeight: action.innerHeight
			};

		case 'SCROLL_DOWN':
			return {
				...state,
				scrollTop: Math.min(
					state.innerHeight - state.height,
					state.scrollTop + 1
				)
			};

		case 'SCROLL_UP':
			return {
				...state,
				scrollTop: Math.max(0, state.scrollTop - 1)
			};

		default:
			return state;
	}
};

function ScrollArea({height, children}) {
	const [state, dispatch] = React.useReducer(reducer, {
		height,
		scrollTop: 0
	});

	const innerRef = React.useRef();

	React.useEffect(() => {
		const dimensions = measureElement(innerRef.current);

		dispatch({
			type: 'SET_INNER_HEIGHT',
			innerHeight: dimensions.height
		});
	}, []);

	useInput((_input, key) => {
		if (key.downArrow) {
			dispatch({
				type: 'SCROLL_DOWN'
			});
		}

		if (key.upArrow) {
			dispatch({
				type: 'SCROLL_UP'
			});
		}
	});

	return (
		<Box height={height} flexDirection="column" overflow="hidden">
			<Box
				ref={innerRef}
				flexShrink={0}
				flexDirection="column"
				marginTop={-state.scrollTop}
			>
				{children}
			</Box>
		</Box>
	);
}

function Borders() {
	// const ref = React.useRef(0);
	// const [width, setWidth] = React.useState(0);
	// const [height, setHeight] = React.useState(0);
	// const [scrollTop, setScrollTop] = React.useState(0);
	// const [scrollLeft, setScrollLeft] = React.useState(0);

	// React.useEffect(() => {
	// 	const {width, height} = measureElement(ref.current);
	// 	setWidth(width);
	// 	setHeight(height);
	// }, []);

	// useInput((_input, key) => {
	// 	if (key.downArrow) {
	// 		setScrollTop(scrollTop => Math.min(height - 6, scrollTop + 1));
	// 	}

	// 	if (key.upArrow) {
	// 		setScrollTop(scrollTop => Math.max(0, scrollTop - 1));
	// 	}

	// 	if (key.leftArrow) {
	// 		setScrollLeft(scrollLeft => Math.max(0, scrollLeft - 1));
	// 	}

	// 	if (key.rightArrow) {
	// 		setScrollLeft(scrollLeft => Math.min(width - 6, scrollLeft + 1));
	// 	}
	// });

	return (
		<Box flexDirection="column" paddingBottom={1}>
			<ScrollArea height={6}>
				{Array.from({length: 20})
					.fill(true)
					.map((_, index) => (
						<Box key={index} flexShrink={0} borderStyle="single">
							<Text>Item #{index + 1}</Text>
						</Box>
					))}
			</ScrollArea>
		</Box>
	);
}

console.log(ansiEscapes.clearScreen);
render(<Borders />, {debug: false});
