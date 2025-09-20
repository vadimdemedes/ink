import React from 'react';
import test from 'ava';
import {Box} from '../src/index.js';
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
			<Box width={4}>Test</Box>
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
			<Box width={4}>Test</Box>
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
			<Box width={4}>Test</Box>
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

test('border dimmed background via shorthand and per-side', t => {
	const output = renderToString(
		<Box
			borderBackgroundDimColor
			borderBackgroundColor="rgb(128, 0, 128)"
			borderStyle="single"
		>
			<Box width={4}>Test</Box>
		</Box>,
	);

	// Dim uses SGR 2 wrapped around colored content; presence of '\u001B[2m'
	// indicates dim was applied on the border string
	t.true(output.includes('\u001B[2m'));
});
