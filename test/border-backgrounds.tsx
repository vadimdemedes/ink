import test, {before, after, type TestContext} from 'node:test';
import React from 'react';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';
import {enableTestColors, disableTestColors} from './helpers/force-colors.js';

// Ensure Chalk emits colors in non-TTY test environment
before(() => {
	enableTestColors();
});

after(() => {
	disableTestColors();
});

test('border with background color', (t: TestContext) => {
	const output = renderToString(
		<Box borderStyle="single" borderColor="white" borderBackgroundColor="blue">
			<Box width={4}>
				<Text>Test</Text>
			</Box>
		</Box>,
	);

	// Verify the border characters are rendered
	t.assert.ok(output.includes('┌'));
	t.assert.ok(output.includes('┐'));
	t.assert.ok(output.includes('└'));
	t.assert.ok(output.includes('┘'));
	t.assert.ok(output.includes('Test'));

	// Verify background color escape for blue is present
	// Named blue background => ESC[44m
	t.assert.ok(output.includes('\u{1B}[44m'));
});

test('border with different background colors per side', (t: TestContext) => {
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
	t.assert.ok(output.includes('┌'));
	t.assert.ok(output.includes('┐'));
	t.assert.ok(output.includes('└'));
	t.assert.ok(output.includes('┘'));
	t.assert.ok(output.includes('Test'));

	// Verify background colors for each named color are present
	// red => 41, green => 42, yellow => 43, blue => 44
	t.assert.ok(output.includes('\u{1B}[41m'));
	t.assert.ok(output.includes('\u{1B}[42m'));
	t.assert.ok(output.includes('\u{1B}[43m'));
	t.assert.ok(output.includes('\u{1B}[44m'));
});

test('border background color fallback to general borderBackgroundColor', (t: TestContext) => {
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
	t.assert.ok(output.includes('┌'));
	t.assert.ok(output.includes('┐'));
	t.assert.ok(output.includes('└'));
	t.assert.ok(output.includes('┘'));
	t.assert.ok(output.includes('Test'));

	// Verify cyan (46) and magenta (45) backgrounds appear
	t.assert.ok(output.includes('\u{1B}[46m'));
	t.assert.ok(output.includes('\u{1B}[45m'));
});

test('vertical border background does not bleed into content rows', (t: TestContext) => {
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

	const bgCyanPattern = '\u{1B}\\[46m';
	const bgResetPattern = '\u{1B}\\[49m';
	const tableBorderChar = '|';
	const tableBorderPattern = bgCyanPattern + tableBorderChar + bgResetPattern;

	const contentRowPattern = new RegExp(
		// eslint-disable-next-line regexp/no-control-character -- The pattern matches ANSI escape sequences, which start with a control character.
		`^${tableBorderPattern}.*${tableBorderPattern}$`,
	);

	const tableRows = output.split('\n');
	const contentRows = tableRows.slice(1, -1);
	t.plan(contentRows.length);
	for (const contentRow of contentRows) {
		t.assert.match(contentRow, contentRowPattern);
	}
});

test('foreground, background and dim combine correctly', (t: TestContext) => {
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
	t.assert.ok(output.includes('\u{1B}[31m'));
	t.assert.ok(output.includes('\u{1B}[46m'));
	t.assert.ok(output.includes('\u{1B}[2m'));
});
