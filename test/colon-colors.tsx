import React from 'react';
import test from 'ava';
import {Box, Text, renderToString} from '../src/index.js';

for (const [colon, semicolon] of [
	['38:5:196', '38;5;196'],
	['48:5:21', '48;5;21'],
	['38:2::255:0:0', '38;2;255;0;0'],
	['48:2::0:0:255', '48;2;0;0;255'],
	['38:2:255:0:0', '38;2;255;0;0'],
	['38:2:0:255:0:0', '38;2;255;0;0'],
	['1;38:5:196;48:2::0:0:255', '1;38;5;196;48;2;0;0;255'],
] as const) {
	test(`colon color ${colon} preserves layout beside a sibling`, t => {
		const view = (parameters: string) => (
			<Box width={6} borderStyle="single">
				<Text>{`[${parameters}mRed[0m`}</Text>
				<Text>X</Text>
			</Box>
		);

		t.is(renderToString(view(colon)), renderToString(view(semicolon)));
	});
}

test('colon colors wrap and reset like semicolon colors', t => {
	const view = (parameters: string) => (
		<Box width={2}>
			<Text>{`[${parameters}mABCD[0mE`}</Text>
		</Box>
	);

	t.is(renderToString(view('38:5:196')), renderToString(view('38;5;196')));
});

test('color normalization leaves colon-containing hyperlink targets intact', t => {
	const url = 'https://example.com/38:5:196';
	const content = `]8;;${url}\\Link]8;;\\`;
	const view = (parameters: string) => (
		<Text>{`[${parameters}m${content}[0m`}</Text>
	);

	const output = renderToString(view('38:5:196'));
	t.true(output.includes(url));
	t.is(output, renderToString(view('38;5;196')));
});

test('colon parameters of other SGR attributes stay untouched', t => {
	const output = renderToString(<Text>{'\u001B[4:3mCurly\u001B[4:0m'}</Text>);

	t.true(output.includes('\u001B[4:3m'));
});
