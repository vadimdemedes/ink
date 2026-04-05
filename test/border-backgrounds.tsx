import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import {enableTestColors, disableTestColors} from './helpers/force-colors.js';

// Ensure Chalk emits colors in non-TTY test environment
test.before(() => {
	enableTestColors();
});

test.after(() => {
	disableTestColors();
});

test('border with background color', t => {
	const output = renderToString(
		<Box borderStyle="single" borderColor="white" borderBackgroundColor="blue">
			<Box width={4}>
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	// Verify the border characters are rendered
	t.true(output.includes('┌'));
	t.true(output.includes('┐'));
	t.true(output.includes('└'));
	t.true(output.includes('┘'));
	t.true(output.includes('Test'));

	// Verify background color escape for blue is present
	// Named blue background => ESC[44m
	t.true(output.includes('\u001B[44m'));
});

test('border with different background colors per side', t => {
	const output = renderToString(
		<Box
			borderStyle="single"
			borderTopBackgroundColor="red"
			borderBottomBackgroundColor="blue"
			borderLeftBackgroundColor="green"
			borderRightBackgroundColor="yellow"
		>
			<Box width={4}>
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	// Verify the border characters are rendered
	t.true(output.includes('┌'));
	t.true(output.includes('┐'));
	t.true(output.includes('└'));
	t.true(output.includes('┘'));
	t.true(output.includes('Test'));

	// Verify background colors for each named color are present
	// red => 41, green => 42, yellow => 43, blue => 44
	t.true(output.includes('\u001B[41m'));
	t.true(output.includes('\u001B[42m'));
	t.true(output.includes('\u001B[43m'));
	t.true(output.includes('\u001B[44m'));
});

test('border background color fallback to general borderBackgroundColor', t => {
	const output = renderToString(
		<Box
			borderStyle="single"
			borderBackgroundColor="magenta"
			borderTopBackgroundColor="cyan"
		>
			<Box width={4}>
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	// Verify the border characters are rendered
	t.true(output.includes('┌'));
	t.true(output.includes('┐'));
	t.true(output.includes('└'));
	t.true(output.includes('┘'));
	t.true(output.includes('Test'));

	// Verify cyan (46) and magenta (45) backgrounds appear
	t.true(output.includes('\u001B[46m'));
	t.true(output.includes('\u001B[45m'));
});

test('vertical border background does not bleed into content rows', t => {
	const output = renderToString(
		<Box
			borderStyle="classic"
			borderBackgroundColor="cyan"
			alignSelf="flex-start"
			width={12}
		>
			<Text>Text longer than the Box width, so will definitely wrap.</Text>
		</Box>,
	);

	const bgCyanPattern = '\u001B\\[46m';
	const bgResetPattern = '\u001B\\[49m';
	const tableBorderChar = '|';
	const tableBorderPattern = bgCyanPattern + tableBorderChar + bgResetPattern;
	const contentRowPattern = new RegExp(
		`^${tableBorderPattern}.*${tableBorderPattern}$$`,
	);

	const tableRows = output.split('\n');
	const contentRows = tableRows.slice(1, -1);
	t.plan(contentRows.length);
	for (const contentRow of contentRows) {
		t.regex(contentRow, contentRowPattern);
	}
});

test('foreground, background and dim combine correctly', t => {
	const output = renderToString(
		<Box
			borderTopDimColor
			borderStyle="single"
			borderTopColor="red"
			borderTopBackgroundColor="cyan"
			alignSelf="flex-start"
		>
			<Text>Hi</Text>
		</Box>,
	);

	// Expect red FG (31), cyan BG (46) and dim (2) to appear
	t.true(output.includes('\u001B[31m'));
	t.true(output.includes('\u001B[46m'));
	t.true(output.includes('\u001B[2m'));
});
