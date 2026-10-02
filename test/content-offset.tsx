import test, {type TestContext} from 'node:test';
import React from 'react';
import boxen from 'boxen';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('contentOffsetY - scrolls content up', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={1}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Text>Line 3</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'Line 2\nLine 3');
});

test('contentOffsetY - zero offset renders content unchanged', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={0}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Text>Line 3</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'Line 1\nLine 2');
});

test('contentOffsetY - offset beyond content renders empty', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={5}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\n');
});

test('contentOffsetY - negative offset shifts content down', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={-1}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, '\nLine 1');
});

test('contentOffsetX - scrolls content left', (t: TestContext) => {
	const output = renderToString(
		<Box width={5} overflowX="hidden" contentOffsetX={6}>
			<Box width={11} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'World');
});

test('contentOffsetX and contentOffsetY - scroll both directions', (t: TestContext) => {
	const output = renderToString(
		<Box
			width={3}
			height={2}
			overflow="hidden"
			contentOffsetX={2}
			contentOffsetY={1}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0} width={5}>
				<Text>aaaaa</Text>
				<Text>bbbbb</Text>
				<Text>ccccc</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, 'bbb\nccc');
});

test('contentOffsetY - content stays inside border', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={4}
			width={8}
			overflowY="hidden"
			contentOffsetY={1}
			borderStyle="round"
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Text>Line 3</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(
		output,
		boxen('Line 2\nLine 3', {borderStyle: 'round', width: 8}),
	);
});

test('contentOffsetY - nested offset containers compose', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={1}
			flexDirection="column"
		>
			<Box
				height={4}
				overflowY="hidden"
				contentOffsetY={1}
				flexDirection="column"
				flexShrink={0}
			>
				<Box flexDirection="column" flexShrink={0}>
					<Text>Line 1</Text>
					<Text>Line 2</Text>
					<Text>Line 3</Text>
					<Text>Line 4</Text>
				</Box>
			</Box>
		</Box>,
	);

	// Inner box scrolls to lines 2-4; outer box shows rows 2-3 of that: lines 3-4.
	t.assert.strictEqual(output, 'Line 3\nLine 4');
});

test('nested clipped content stays inside the outer clip', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>ABOVE</Text>
			<Box height={2} overflowY="hidden" flexDirection="column">
				<Box
					height={4}
					marginTop={-2}
					overflowY="hidden"
					flexDirection="column"
					flexShrink={0}
				>
					<Text>Line 1</Text>
					<Text>Line 2</Text>
					<Text>Line 3</Text>
					<Text>Line 4</Text>
				</Box>
			</Box>
		</Box>,
	);

	// The inner box starts above the outer viewport, so its own clip alone would let lines 1-2 paint over "ABOVE". Only the intersection of both clips keeps them out. No content offset involved, this is the underlying renderer bug.
	t.assert.strictEqual(output, 'ABOVE\nLine 3\nLine 4');
});

test('nested clips on different axes both apply', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>HEADER</Text>
			<Box height={2} overflowY="hidden" flexDirection="column">
				<Box
					width={3}
					overflowX="hidden"
					marginTop={-1}
					flexDirection="column"
					flexShrink={0}
				>
					<Text>AAAAAA</Text>
					<Text>BBBBBB</Text>
					<Text>CCCCCC</Text>
				</Box>
			</Box>
		</Box>,
	);

	// The inner box clips only horizontally and the outer only vertically, so the merged clip has to carry both bounds. "AAA" sits a row above the viewport and must not reach "HEADER".
	t.assert.strictEqual(output, 'HEADER\nAAA\nBBB');
});

test('disjoint nested clips render nothing', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>HEADER</Text>
			<Box width={5} overflowX="hidden">
				<Box marginLeft={10} width={10} overflowX="hidden" flexShrink={0}>
					<Text>XXXXXXXXXX</Text>
				</Box>
			</Box>
		</Box>,
	);

	// The two clips do not overlap, so the intersection is empty and nothing may be drawn.
	t.assert.strictEqual(output, 'HEADER\n');
});

test('disjoint nested clips do not overwrite content when a wide character straddles the edge', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>XXXXXXXXXX</Text>
			<Box marginTop={-1} width={5} overflowX="hidden" flexShrink={0}>
				<Box
					marginLeft={6}
					width={5}
					overflowX="hidden"
					contentOffsetX={1}
					flexShrink={0}
				>
					<Box flexShrink={0}>
						<Text>你AAAA</Text>
					</Box>
				</Box>
			</Box>
		</Box>,
		{columns: 20},
	);

	// The clips cover columns 0-5 and 6-11, so the intersection is empty. The offset puts the write one column left of the inner clip, splitting the wide character, and the padding that repairs a split cell used to be emitted even though no column was visible, landing a space on column 6 and blanking a cell outside both clips.
	t.assert.strictEqual(output, 'XXXXXXXXXX\n');
});

test('contentOffsetY - nested clipped content does not escape the outer viewport', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>ABOVE</Text>
			<Box
				height={2}
				overflowY="hidden"
				contentOffsetY={1}
				flexDirection="column"
			>
				<Box
					height={4}
					overflowY="hidden"
					flexDirection="column"
					flexShrink={0}
				>
					<Text>Line 1</Text>
					<Text>Line 2</Text>
					<Text>Line 3</Text>
					<Text>Line 4</Text>
				</Box>
			</Box>
		</Box>,
	);

	// Offsetting the outer box must not let the inner box paint over "ABOVE" above it.
	t.assert.strictEqual(output, 'ABOVE\nLine 2\nLine 3');
});

test('contentOffsetX/Y - fractional offsets are truncated to whole cells', (t: TestContext) => {
	const vertical = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={1.5}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
				<Text>Line 3</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(vertical, 'Line 2\nLine 3');

	const horizontal = renderToString(
		<Box width={6} overflowX="hidden" contentOffsetX={1.5}>
			<Box flexShrink={0}>
				<Text>ABCDEF</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(horizontal, 'BCDEF');
});

test('contentOffsetX/Y - negative fractional offsets are truncated to whole cells', (t: TestContext) => {
	const vertical = renderToString(
		<Box
			height={2}
			overflowY="hidden"
			contentOffsetY={-0.5}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(vertical, 'Line 1\nLine 2');

	const horizontal = renderToString(
		<Box width={6} overflowX="hidden" contentOffsetX={-0.5}>
			<Box flexShrink={0}>
				<Text>ABCDEF</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(horizontal, 'ABCDEF');
});

test('contentOffsetX/Y - non-finite offsets fall back to zero', (t: TestContext) => {
	for (const offset of [NaN, Infinity, -Infinity]) {
		const vertical = renderToString(
			<Box
				height={2}
				overflowY="hidden"
				contentOffsetY={offset}
				flexDirection="column"
			>
				<Box flexDirection="column" flexShrink={0}>
					<Text>Line 1</Text>
					<Text>Line 2</Text>
				</Box>
			</Box>,
		);

		t.assert.strictEqual(vertical, 'Line 1\nLine 2');

		const horizontal = renderToString(
			<Box width={6} overflowX="hidden" contentOffsetX={offset}>
				<Box flexShrink={0}>
					<Text>ABCDEF</Text>
				</Box>
			</Box>,
		);

		t.assert.strictEqual(horizontal, 'ABCDEF');
	}
});

test('contentOffsetX - preserves columns when offset splits a wide character', (t: TestContext) => {
	const render = (contentOffsetX: number) =>
		renderToString(
			<Box width={2} overflowX="hidden" contentOffsetX={contentOffsetX}>
				<Box width={3} flexShrink={0}>
					<Text>你A</Text>
				</Box>
			</Box>,
		);

	// The viewport starts on the second half of `你`, which occupies a cell of
	// its own, so `A` stays in the second column instead of sliding left.
	t.assert.strictEqual(render(1), ' A');
	t.assert.strictEqual(render(2), 'A');
});

test('contentOffsetX - preserves columns across a line of wide characters', (t: TestContext) => {
	// `你好AB` occupies columns: 你 (0-1), 好 (2-3), A (4), B (5).
	const expected = ['你好', ' 好A', '好AB', ' AB', 'AB'];

	for (const [contentOffsetX, want] of expected.entries()) {
		const output = renderToString(
			<Box width={4} overflowX="hidden" contentOffsetX={contentOffsetX}>
				<Box width={6} flexShrink={0}>
					<Text>你好AB</Text>
				</Box>
			</Box>,
		);

		t.assert.strictEqual(output, want, `offset ${contentOffsetX}`);
	}
});

test('clipping blanks the cell of a wide character split by the right edge', (t: TestContext) => {
	const output = renderToString(
		<Box>
			<Text>XY</Text>
			<Box position="absolute" width={2} overflowX="hidden">
				<Box width={3} flexShrink={0}>
					<Text>A你</Text>
				</Box>
			</Box>
		</Box>,
	);

	// The clipped half of `你` owns its cell and blanks the `Y` underneath,
	// rather than leaving a stale character behind. Trailing blanks are trimmed
	// from the rendered line, so this reads as 'A'.
	t.assert.strictEqual(output, 'A');
});

test('horizontal scrolling preserves borders beside fully clipped rows', (t: TestContext) => {
	const output = renderToString(
		<Box
			width={4}
			height={4}
			borderStyle="single"
			overflow="hidden"
			contentOffsetX={6}
		>
			<Box width={10} flexShrink={0}>
				<Text>{'A\nABCDEFGHIJ'}</Text>
			</Box>
		</Box>,
	);

	t.assert.strictEqual(output, ['┌──┐', '│  │', '│GH│', '└──┘'].join('\n'));
});

test('contentOffsetY - keeps the visible lines of a multi-line text node', (t: TestContext) => {
	const output = renderToString(
		<Box height={2} contentOffsetY={1} flexDirection="column">
			<Box flexDirection="column" flexShrink={0}>
				<Text>{'Line 1\nLine 2\nLine 3'}</Text>
			</Box>
		</Box>,
	);

	// The offset puts the text node one row above the top of the output, so only its first line is off screen. The box sets no `overflow`, so nothing slices the lines before they are written.
	t.assert.strictEqual(output, 'Line 2\nLine 3');
});

test('contentOffsetY - keeps the visible lines of a multi-line text node with only horizontal clipping', (t: TestContext) => {
	const output = renderToString(
		<Box
			height={2}
			overflowX="hidden"
			contentOffsetY={1}
			flexDirection="column"
		>
			<Box flexDirection="column" flexShrink={0}>
				<Text>{'Line 1\nLine 2\nLine 3'}</Text>
			</Box>
		</Box>,
	);

	// `overflowX="hidden"` clips columns only, so the vertical write path still receives the full set of lines with a negative `y`.
	t.assert.strictEqual(output, 'Line 2\nLine 3');
});

test('clipped content keeps its visible lines when the clip starts above the top', (t: TestContext) => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box marginTop={-1} height={3} overflowY="hidden" flexDirection="column">
				<Box flexDirection="column" flexShrink={0}>
					<Text>{'Line 1\nLine 2\nLine 3'}</Text>
				</Box>
			</Box>
		</Box>,
	);

	// The clipping box itself starts one row above the top, so `clip.y1` is negative and the reset after the slice leaves `y` negative as well.
	t.assert.strictEqual(output, 'Line 2\nLine 3');
});
