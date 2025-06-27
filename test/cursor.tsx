import test from 'ava';
import React from 'react';
import ansiEscapes from 'ansi-escapes';
import {Box, Cursor, Text, render} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

test('cursor - before text', t => {
	const stdout = createStdout();
	render(
		<Box>
			<Cursor />
			<Text>Hello</Text>
		</Box>,
		{stdout},
	);

	t.is(
		stdout.get(),
		'Hello\n' + ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(0),
	);
});

test('cursor - between text', t => {
	const stdout = createStdout();
	render(
		<Box>
			<Text>Hello, </Text>
			<Cursor />
			<Text>World</Text>
		</Box>,
		{stdout},
	);

	t.is(
		stdout.get(),
		'Hello, World\n' + ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(7),
	);
});

test('cursor - after text', t => {
	const stdout = createStdout();
	render(
		<Box>
			<Text>Hello</Text>
			<Cursor />
		</Box>,
		{stdout},
	);

	t.is(
		stdout.get(),
		'Hello\n' + ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(5),
	);
});

test('cursor - in a box with padding', t => {
	const stdout = createStdout();
	render(
		<Box padding={1}>
			<Text>Hello</Text>
			<Cursor />
		</Box>,
		{stdout},
	);

	t.is(
		stdout.get(),
		'\n Hello\n\n' + ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(6),
	);
});
