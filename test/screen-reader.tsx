import test from 'ava';
import React from 'react';
import {render, Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('render text for screen readers', t => {
	const output = renderToString(
		<Box aria-label="Hello World">
			<Text>Not visible to screen readers</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Hello World');
});

test('render text for screen readers with aria-hidden', t => {
	const output = renderToString(
		<Box aria-hidden>
			<Text>Not visible to screen readers</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, '');
});

test('render text for screen readers with aria-role', t => {
	const output = renderToString(
		<Box aria-role="button">
			<Text>Click me</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'button: Click me');
});
