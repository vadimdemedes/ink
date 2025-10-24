/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import React from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	setStringWidthFunction,
	type Instance,
	clearStringWidthCache,
} from '../../src/index.js';
import {toStyledCharacters} from '../../src/measure-text.js';
import {testChars} from './char-list.js';
import {createStringWidth, log} from './measure-text.js';

const isAppleTerminal = process.env.TERM_PROGRAM === 'Apple_Terminal';

const truncationModes = [
	undefined,
	'wrap',
	'end',
	'middle',
	'truncate-end',
	'truncate',
	'truncate-middle',
	'truncate-start',
] as const;

function CharListViewer() {
	const [visibleCount, setVisibleCount] = React.useState(1);
	const [hasBackgroundColor, setHasBackgroundColor] = React.useState(false);
	const [hasMinWidth, setHasMinWidth] = React.useState(false);
	const [truncationIndex, setTruncationIndex] = React.useState(0);
	const [width, setWidth] = React.useState(20);

	useInput((input, key) => {
		if (input === ' ') {
			log(
				'MEASURING....' +
					JSON.stringify(
						toStyledCharacters(testChars[visibleCount - 1] + 'lorem'),
					),
			);
			setVisibleCount(previousCount =>
				Math.min(testChars.length, previousCount + 1),
			);
		}

		if (input === 'b') {
			setHasBackgroundColor(previous => !previous);
		}

		if (input === 'w') {
			setHasMinWidth(previous => !previous);
		}

		if (input === 't') {
			setTruncationIndex(
				previousIndex => (previousIndex + 1) % truncationModes.length,
			);
		}

		if (key.rightArrow) {
			setWidth(previousWidth => previousWidth + 1);
		}

		if (key.leftArrow) {
			setWidth(previousWidth => Math.max(10, previousWidth - 1));
		}
	});

	const truncationMode = truncationModes[truncationIndex];

	return (
		<Box
			borderStyle="round"
			width={width}
			padding-top={1}
			padding-left={1}
			paddingBottom={1}
			paddingRight={0}
			flexDirection="column"
		>
			{isAppleTerminal && (
				<Text color="yellow">
					Apple Terminal detected, skipping measurement as it is not supported.
				</Text>
			)}
			<Text>
				space: add char, b: background, w: minWidth, t: truncate, ←/→: change
				width. Count: {visibleCount}
			</Text>
			{truncationMode && <Text>Truncate mode: {truncationMode}</Text>}
			{testChars.slice(0, visibleCount).map((char, i) => (
				// eslint-disable-next-line react/no-array-index-key
				<Box key={i}>
					{!truncationMode && (
						<Box
							backgroundColor={hasBackgroundColor ? 'blue' : undefined}
							minWidth={hasMinWidth ? 3 : undefined}
						>
							<Text>{char}</Text>
						</Box>
					)}
					{truncationMode ? (
						<Text wrap={truncationMode}>{char.repeat(20)}</Text>
					) : (
						<Text>lorem ipsum</Text>
					)}
				</Box>
			))}
		</Box>
	);
}

// eslint-disable-next-line prefer-const
let app: Instance;

const stringWidth = createStringWidth(() => {
	clearStringWidthCache();
	app.recalculateLayout();
});
setStringWidthFunction(stringWidth);

app = render(<CharListViewer />, {
	exitOnCtrlC: true,
	alternateBuffer: true,
});

try {
	await app.waitUntilExit();
} catch (error) {
	console.log('exited', error);
}
