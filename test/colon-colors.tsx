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

for (const [colon, semicolon] of [['4:3', '4']] as const) {
	test(`underline style ${colon} renders as plain underline beside a sibling`, t => {
		const view = (parameters: string) => (
			<Box>
				<Box width={6}>
					<Text>{`\u001B[${parameters}mab\u001B[0m`}</Text>
				</Box>
				<Text>|</Text>
			</Box>
		);

		const output = renderToString(view(colon));

		t.is(output, `\u001B[${semicolon}mab\u001B[24m    |`);
		t.is(output, renderToString(view(semicolon)));
	});
}

test('underline style reset 4:0 turns the underline off', t => {
	t.is(
		renderToString(
			<Box>
				<Box width={6}>
					<Text>{'\u001B[4:3ma\u001B[4:0mb'}</Text>
				</Box>
				<Text>|</Text>
			</Box>,
		),
		'\u001B[4ma\u001B[24mb    |',
	);
});

for (const parameters of ['58:5:1', '58:2::1:2:3']) {
	test(`underline color ${parameters} is dropped beside a sibling`, t => {
		t.is(
			renderToString(
				<Box>
					<Box width={6}>
						<Text>{`\u001B[${parameters}mab\u001B[59m`}</Text>
					</Box>
					<Text>|</Text>
				</Box>,
			),
			'ab    |',
		);
	});

	test(`underline color ${parameters} is dropped inside a clipped box`, t => {
		t.is(
			renderToString(
				<Box width={1} overflow="hidden">
					<Text>{`\u001B[${parameters}mab\u001B[59m`}</Text>
				</Box>,
			),
			'a\nb',
		);
	});
}

test('underline style 4:3 is clipped like plain underline', t => {
	t.is(
		renderToString(
			<Box width={1} overflow="hidden">
				<Text>{'\u001B[4:3mab\u001B[4:0m'}</Text>
			</Box>,
		),
		'\u001B[4ma\u001B[24m\n\u001B[4mb\u001B[24m',
	);
});
