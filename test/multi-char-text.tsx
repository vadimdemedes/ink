/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import test, {type ExecutionContext} from 'ava';
import stringWidth from 'string-width';
import {
	Box,
	Text,
	clearStringWidthCache,
	render,
	setStringWidthFunction,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {enableTestColors, disableTestColors} from './helpers/force-colors.js';

// Enable colors for all tests
test.before(() => {
	enableTestColors();
});

test.after(() => {
	disableTestColors();
});

test.afterEach(() => {
	setStringWidthFunction(stringWidth);
	clearStringWidthCache();
});

// Test cases for multi-character graphemes
const multiCharStrings = {
	flagEmoji: '🇺🇸', // US Flag
	familyEmoji: '👨‍👩‍👧‍👦', // Family emoji
	rainbowFlagEmoji: '🏳️‍🌈', // Rainbow flag
	thumbsUpEmoji: '👍', // Thumbs up
	skinToneEmoji: '👍🏾', // Thumbs up with skin tone
	complexGrapheme: 'é', // E with acute accent - combining
	width1Check: '✔',
	check: '✔️',
	checkWithVarianceSelector: '✔️\uFE0F', // Add variance selector to make sure that is handled correctly.
};

type TestFn = (t: ExecutionContext) => React.ReactElement;

type WidthFn = (s: string) => number;

export const renderToString: (
	node: React.JSX.Element,
	options?: {columns?: number; isScreenReaderEnabled?: boolean},
) => string = (node, options) => {
	const stdout = createStdout(options?.columns ?? 100);

	const instance = render(node, {
		stdout,
		debug: true,
		isScreenReaderEnabled: options?.isScreenReaderEnabled,
	});
	instance.recalculateLayout();

	const output = stdout.get();
	return output;
};

const isEmoji = (s: string): boolean => {
	return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s);
};

const emojiWidth1: WidthFn = s => {
	if (isEmoji(s)) {
		return 1;
	}

	return stringWidth(s);
};

const emojiWidth2: WidthFn = s => {
	if (isEmoji(s)) {
		return 2;
	}

	return stringWidth(s);
};

const emojiWidth3: WidthFn = s => {
	if (isEmoji(s)) {
		return 3;
	}

	return stringWidth(s);
};

const widthScenarios: Array<{name: string; widthFn: WidthFn}> = [
	{name: 'default width', widthFn: stringWidth},
	{
		name: 'width 1 emojis',
		widthFn: emojiWidth1,
	},
	{
		name: 'width 2 emojis',
		widthFn: emojiWidth2,
	},
	{
		name: 'width 3 emojis',
		widthFn: emojiWidth3,
	},
];

const snapshotMacroWithAllWidths = (title: string, testFn: TestFn) => {
	for (const {name, widthFn} of widthScenarios) {
		test(`${title} - ${name}`, t => {
			setStringWidthFunction(widthFn);

			const output = renderToString(testFn(t));
			t.snapshot(output);
		});
	}
};

const snapshotMacroWithDefaultWidth = (title: string, testFn: TestFn) => {
	test(`${title} - default width`, t => {
		setStringWidthFunction(stringWidth);
		const output = renderToString(testFn(t));
		t.snapshot(output);
	});
};

snapshotMacroWithAllWidths(
	'multi-character emoji in fixed-width box with border',
	() => (
		<Box borderStyle="round" width={2}>
			<Text>{multiCharStrings.familyEmoji}</Text>
		</Box>
	),
);

snapshotMacroWithAllWidths(
	'multi-character emoji wrapping in a box with border followed by some text',
	() => (
		<Box borderStyle="round">
			<Text>{multiCharStrings.familyEmoji}foo</Text>
		</Box>
	),
);

snapshotMacroWithAllWidths(
	'multi-character emoji with background color',
	() => (
		<Box borderStyle="round" width={12} backgroundColor="blue">
			<Text>Hi {multiCharStrings.flagEmoji}</Text>
		</Box>
	),
);

snapshotMacroWithAllWidths(
	'multiple multi-character emojis with wrapping and background',
	() => (
		<Box borderStyle="round" width={10} backgroundColor="green">
			<Text>
				{multiCharStrings.flagEmoji} {multiCharStrings.familyEmoji}
			</Text>
		</Box>
	),
);

snapshotMacroWithDefaultWidth('combining character in fixed-width box', () => (
	<Box borderStyle="round" width={10}>
		<Text>cafe{multiCharStrings.complexGrapheme}</Text>
	</Box>
));

snapshotMacroWithAllWidths('all multi-character strings in one box', () => (
	<Box flexDirection="column">
		{Object.entries(multiCharStrings).map(([name, str]) => (
			<Box key={name} borderStyle="round">
				<Text>
					{str}
					{name}
				</Text>
			</Box>
		))}
	</Box>
));

// Regression test for issue where tab truncation would kick out the side of the box.
snapshotMacroWithDefaultWidth('box with many tabs', () => (
	<Box borderStyle="round" width={5}>
		<Text wrap="truncate-end">{'\t'.repeat(20)}</Text>
	</Box>
));

snapshotMacroWithDefaultWidth('box with backspace characters', () => (
	<Box borderStyle="round">
		<Text>hello{'\b'} world</Text>
	</Box>
));

const truncationModes = [
	'wrap',
	'end',
	'middle',
	'truncate-end',
	'truncate',
	'truncate-middle',
	'truncate-start',
] as const;

const emojiLine = '👍'.repeat(5); // Width 10

for (const mode of truncationModes) {
	snapshotMacroWithDefaultWidth(`emoji truncation with wrap="${mode}"`, () => (
		<Box flexDirection="column">
			<Box borderStyle="round" width={9} paddingTop={1} paddingBottom={1}>
				<Text wrap={mode}>{emojiLine}</Text>
			</Box>
			<Box borderStyle="round" width={10} paddingTop={1} paddingBottom={1}>
				<Text wrap={mode}>{emojiLine}</Text>
			</Box>
		</Box>
	));
}

test('wrapping of the same complex emoji repeated 20 times', t => {
	const emoji = multiCharStrings.familyEmoji;
	const text = emoji.repeat(20);

	setStringWidthFunction(emojiWidth1);

	const outputWidth1 = renderToString(
		<Box width={10} borderStyle="round">
			<Text>{text}</Text>
		</Box>,
	);
	t.snapshot(outputWidth1, 'width 1 emojis');

	// Scenario 2: Emojis have width 3
	setStringWidthFunction(emojiWidth3);

	const outputWidth3 = renderToString(
		<Box width={10} borderStyle="round">
			<Text>{text}</Text>
		</Box>,
	);
	t.snapshot(outputWidth3, 'width 3 emojis');
});

test('recalculate layout on string width function change and rerender', t => {
	setStringWidthFunction(stringWidth);

	const stdout = createStdout();
	const text = multiCharStrings.familyEmoji.repeat(20);

	function Component() {
		return (
			<Box width={10} borderStyle="round">
				<Text>{text}</Text>
			</Box>
		);
	}

	const instance = render(<Component />, {
		stdout,
	});

	t.teardown(instance.unmount);

	const outputBefore = stdout.get();
	t.snapshot(outputBefore, 'default width');

	setStringWidthFunction(emojiWidth1);
	instance.recalculateLayout();

	const outputAfter = stdout.get();
	t.not(outputBefore, outputAfter);
	t.snapshot(outputAfter, 'width 1 emojis');
});

test('multiline string starting with 2-char emoji wrapped in box with varying width and padding', t => {
	const emoji = multiCharStrings.flagEmoji;
	setStringWidthFunction(stringWidth);

	const scenarios = [
		{width: 14, padding: 0},
		{width: 13, padding: 0},
		{width: 16, padding: 1},
		{width: 15, padding: 1},
	];

	for (const {width, padding} of scenarios) {
		const output = renderToString(
			<Box
				borderStyle="round"
				width={width}
				padding={padding}
				flexDirection="column"
			>
				<Box>
					<Box flexShrink={0}>
						<Text>{emoji}</Text>
					</Box>
					<Text>lorem ipsum</Text>
				</Box>
				<Box>
					<Box flexShrink={0}>
						<Text>{emoji}</Text>
					</Box>
					<Text>lorem ipsum</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output, `width ${width}, padding ${padding}`);
	}
});
