import test from 'ava';
import React from 'react';
import {Box, Text} from '../src/index.js';
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

test('render select input for screen readers', t => {
	const items = ['Red', 'Green', 'Blue'];

	const output = renderToString(
		<Box flexDirection="column" aria-role="list">
			<Text>Select a color:</Text>
			{items.map((item, index) => {
				const isSelected = index === 1;
				const screenReaderLabel = `${index + 1}. ${item}`;

				return (
					<Box
						key={item}
						aria-role="listitem"
						aria-state={{selected: isSelected}}
						aria-label={screenReaderLabel}
					>
						<Text>{item}</Text>
					</Box>
				);
			})}
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(
		output,
		'list: Select a color:\nlistitem: 1. Red\nlistitem, selected: 2. Green\nlistitem: 3. Blue',
	);
});
