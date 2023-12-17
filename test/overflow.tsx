import React from 'react';
import test from 'ava';
import boxen, {type Options} from 'boxen';
import sliceAnsi from 'slice-ansi';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

const box = (text: string, options?: Options): string => {
	return boxen(text, {
		...options,
		borderStyle: 'round',
	});
};

const clipX = (text: string, columns: number): string => {
	return text
		.split('\n')
		.map(line => sliceAnsi(line, 0, columns).trim())
		.join('\n');
};

test('overflowX - single text node in a box inside overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box width={16} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflowX - single text node inside overflow container with border', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden" borderStyle="round">
			<Box width={16} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Hell'));
});

test('overflowX - single text node in a box with border inside overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box width={16} flexShrink={0} borderStyle="round">
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, clipX(box('Hello'), 6));
});

test('overflowX - multiple text nodes in a box inside overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box width={12} flexShrink={0}>
				<Text>Hello </Text>
				<Text>World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflowX - multiple text nodes in a box inside overflow container with border', t => {
	const output = renderToString(
		<Box width={8} overflowX="hidden" borderStyle="round">
			<Box width={12} flexShrink={0}>
				<Text>Hello </Text>
				<Text>World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Hello '));
});

test('overflowX - multiple text nodes in a box with border inside overflow container', t => {
	const output = renderToString(
		<Box width={8} overflowX="hidden">
			<Box width={12} flexShrink={0} borderStyle="round">
				<Text>Hello </Text>
				<Text>World</Text>
			</Box>
		</Box>,
	);

	t.is(output, clipX(box('HelloWo\n'), 8));
});

test('overflowX - multiple boxes inside overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box width={6} flexShrink={0}>
				<Text>Hello </Text>
			</Box>
			<Box width={6} flexShrink={0}>
				<Text>World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflowX - multiple boxes inside overflow container with border', t => {
	const output = renderToString(
		<Box width={8} overflowX="hidden" borderStyle="round">
			<Box width={6} flexShrink={0}>
				<Text>Hello </Text>
			</Box>
			<Box width={6} flexShrink={0}>
				<Text>World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Hello '));
});

test('overflowX - box before left edge of overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box marginLeft={-12} width={6} flexShrink={0}>
				<Text>Hello</Text>
			</Box>
		</Box>,
	);

	t.is(output, '');
});

test('overflowX - box before left edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden" borderStyle="round">
			<Box marginLeft={-12} width={6} flexShrink={0}>
				<Text>Hello</Text>
			</Box>
		</Box>,
	);

	t.is(output, box(' '.repeat(4)));
});

test('overflowX - box intersecting with left edge of overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box marginLeft={-3} width={12} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'lo Wor');
});

test('overflowX - box intersecting with left edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={8} overflowX="hidden" borderStyle="round">
			<Box marginLeft={-3} width={12} flexShrink={0}>
				<Text>Hello World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('lo Wor'));
});

test('overflowX - box after right edge of overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box marginLeft={6} width={6} flexShrink={0}>
				<Text>Hello</Text>
			</Box>
		</Box>,
	);

	t.is(output, '');
});

test('overflowX - box intersecting with right edge of overflow container', t => {
	const output = renderToString(
		<Box width={6} overflowX="hidden">
			<Box marginLeft={3} width={6} flexShrink={0}>
				<Text>Hello</Text>
			</Box>
		</Box>,
	);

	t.is(output, '   Hel');
});

test('overflowY - single text node inside overflow container', t => {
	const output = renderToString(
		<Box height={1} overflowY="hidden">
			<Text>Hello{'\n'}World</Text>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflowY - single text node inside overflow container with border', t => {
	const output = renderToString(
		<Box width={20} height={3} overflowY="hidden" borderStyle="round">
			<Text>Hello{'\n'}World</Text>
		</Box>,
	);

	t.is(output, box('Hello'.padEnd(18, ' ')));
});

test('overflowY - multiple boxes inside overflow container', t => {
	const output = renderToString(
		<Box height={2} overflowY="hidden" flexDirection="column">
			<Box flexShrink={0}>
				<Text>Line #1</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #2</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #3</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #4</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Line #1\nLine #2');
});

test('overflowY - multiple boxes inside overflow container with border', t => {
	const output = renderToString(
		<Box
			width={9}
			height={4}
			overflowY="hidden"
			flexDirection="column"
			borderStyle="round"
		>
			<Box flexShrink={0}>
				<Text>Line #1</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #2</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #3</Text>
			</Box>
			<Box flexShrink={0}>
				<Text>Line #4</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Line #1\nLine #2'));
});

test('overflowY - box above top edge of overflow container', t => {
	const output = renderToString(
		<Box height={1} overflowY="hidden">
			<Box marginTop={-2} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, '');
});

test('overflowY - box above top edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={7} height={3} overflowY="hidden" borderStyle="round">
			<Box marginTop={-3} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box(' '.repeat(5)));
});

test('overflowY - box intersecting with top edge of overflow container', t => {
	const output = renderToString(
		<Box height={1} overflowY="hidden">
			<Box marginTop={-1} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'World');
});

test('overflowY - box intersecting with top edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={7} height={3} overflowY="hidden" borderStyle="round">
			<Box marginTop={-1} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('World'));
});

test('overflowY - box below bottom edge of overflow container', t => {
	const output = renderToString(
		<Box height={1} overflowY="hidden">
			<Box marginTop={1} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, '');
});

test('overflowY - box below bottom edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={7} height={3} overflowY="hidden" borderStyle="round">
			<Box marginTop={2} height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box(' '.repeat(5)));
});

test('overflowY - box intersecting with bottom edge of overflow container', t => {
	const output = renderToString(
		<Box height={1} overflowY="hidden">
			<Box height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello');
});

test('overflowY - box intersecting with bottom edge of overflow container with border', t => {
	const output = renderToString(
		<Box width={7} height={3} overflowY="hidden" borderStyle="round">
			<Box height={2} flexShrink={0}>
				<Text>Hello{'\n'}World</Text>
			</Box>
		</Box>,
	);

	t.is(output, box('Hello'));
});

test('overflow - single text node inside overflow container', t => {
	const output = renderToString(
		<Box paddingBottom={1}>
			<Box width={6} height={1} overflow="hidden">
				<Box width={12} height={2} flexShrink={0}>
					<Text>Hello{'\n'}World</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.is(output, 'Hello\n');
});

test('overflow - single text node inside overflow container with border', t => {
	const output = renderToString(
		<Box paddingBottom={1}>
			<Box width={8} height={3} overflow="hidden" borderStyle="round">
				<Box width={12} height={2} flexShrink={0}>
					<Text>Hello{'\n'}World</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.is(output, `${box('Hello ')}\n`);
});

test('overflow - multiple boxes inside overflow container', t => {
	const output = renderToString(
		<Box paddingBottom={1}>
			<Box width={4} height={1} overflow="hidden">
				<Box width={2} height={2} flexShrink={0}>
					<Text>TL{'\n'}BL</Text>
				</Box>
				<Box width={2} height={2} flexShrink={0}>
					<Text>TR{'\n'}BR</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.is(output, 'TLTR\n');
});

test('overflow - multiple boxes inside overflow container with border', t => {
	const output = renderToString(
		<Box paddingBottom={1}>
			<Box width={6} height={3} overflow="hidden" borderStyle="round">
				<Box width={2} height={2} flexShrink={0}>
					<Text>TL{'\n'}BL</Text>
				</Box>
				<Box width={2} height={2} flexShrink={0}>
					<Text>TR{'\n'}BR</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.is(output, `${box('TLTR')}\n`);
});

test('overflow - box intersecting with top left edge of overflow container', t => {
	const output = renderToString(
		<Box width={4} height={4} overflow="hidden">
			<Box marginTop={-2} marginLeft={-2} width={4} height={4} flexShrink={0}>
				<Text>
					AAAA{'\n'}BBBB{'\n'}CCCC{'\n'}DDDD
				</Text>
			</Box>
		</Box>,
	);

	t.is(output, 'CC\nDD\n\n');
});

test('overflow - box intersecting with top right edge of overflow container', t => {
	const output = renderToString(
		<Box width={4} height={4} overflow="hidden">
			<Box marginTop={-2} marginLeft={2} width={4} height={4} flexShrink={0}>
				<Text>
					AAAA{'\n'}BBBB{'\n'}CCCC{'\n'}DDDD
				</Text>
			</Box>
		</Box>,
	);

	t.is(output, '  CC\n  DD\n\n');
});

test('overflow - box intersecting with bottom left edge of overflow container', t => {
	const output = renderToString(
		<Box width={4} height={4} overflow="hidden">
			<Box marginTop={2} marginLeft={-2} width={4} height={4} flexShrink={0}>
				<Text>
					AAAA{'\n'}BBBB{'\n'}CCCC{'\n'}DDDD
				</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\nAA\nBB');
});

test('overflow - box intersecting with bottom right edge of overflow container', t => {
	const output = renderToString(
		<Box width={4} height={4} overflow="hidden">
			<Box marginTop={2} marginLeft={2} width={4} height={4} flexShrink={0}>
				<Text>
					AAAA{'\n'}BBBB{'\n'}CCCC{'\n'}DDDD
				</Text>
			</Box>
		</Box>,
	);

	t.is(output, '\n\n  AA\n  BB');
});

test('nested overflow', t => {
	const output = renderToString(
		<Box paddingBottom={1}>
			<Box width={4} height={4} overflow="hidden" flexDirection="column">
				<Box width={2} height={2} overflow="hidden">
					<Box width={4} height={4} flexShrink={0}>
						<Text>
							AAAA{'\n'}BBBB{'\n'}CCCC{'\n'}DDDD
						</Text>
					</Box>
				</Box>

				<Box width={4} height={3}>
					<Text>
						XXXX{'\n'}YYYY{'\n'}ZZZZ
					</Text>
				</Box>
			</Box>
		</Box>,
	);

	t.is(output, 'AA\nBB\nXXXX\nYYYY\n');
});

// See https://github.com/vadimdemedes/ink/pull/564#issuecomment-1637022742
test('out of bounds writes do not crash', t => {
	const output = renderToString(
		<Box width={12} height={10} borderStyle="round" />,
		{columns: 10},
	);

	const expected = boxen('', {
		width: 12,
		height: 10,
		borderStyle: 'round',
	})
		.split('\n')
		.map((line, index) => {
			return index === 0 || index === 9
				? line
				: `${line.slice(0, 10)}${line[11] ?? ''}`;
		})
		.join('\n');

	t.is(output, expected);
});
