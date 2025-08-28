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
		<Box aria-role="list" flexDirection="column">
			<Text>Select a color:</Text>
			{items.map((item, index) => {
				const isSelected = index === 1;
				const screenReaderLabel = `${index + 1}. ${item}`;

				return (
					<Box
						key={item}
						aria-label={screenReaderLabel}
						aria-role="listitem"
						aria-state={{selected: isSelected}}
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
		'list: Select a color:\nlistitem: 1. Red\nlistitem: (selected) 2. Green\nlistitem: 3. Blue',
	);
});

test('render aria-label only Text for screen readers', t => {
	const output = renderToString(<Text aria-label="Screen-reader only" />, {
		isScreenReaderEnabled: true,
	});

	t.is(output, 'Screen-reader only');
});

test('render aria-label only Box for screen readers', t => {
	const output = renderToString(<Box aria-label="Screen-reader only" />, {
		isScreenReaderEnabled: true,
	});

	t.is(output, 'Screen-reader only');
});

test('omit ANSI styling in screen-reader output', t => {
	const output = renderToString(
		<Box>
			{/* eslint-disable-next-line react/jsx-sort-props */}
			<Text bold color="green" inverse underline>
				Styled content
			</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Styled content');
});

test('skip nodes with display:none style in screen-reader output', t => {
	const output = renderToString(
		<Box>
			<Box display="none">
				<Text>Hidden</Text>
			</Box>
			<Text>Visible</Text>
		</Box>,
		{isScreenReaderEnabled: true},
	);

	t.is(output, 'Visible');
});

test('render multiple Text components', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<Text>World</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Hello\nWorld');
});

test('render nested Box components with Text', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<Box>
				<Text>World</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Hello\nWorld');
});

function NullComponent(): undefined {
	return undefined;
}

test('render component that returns null', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Hello</Text>
			<NullComponent />
			<Text>World</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Hello\nWorld');
});

test('render with aria-state.busy', t => {
	const output = renderToString(
		<Box aria-state={{busy: true}}>
			<Text>Loading</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, '(busy) Loading');
});

test('render with aria-state.checked', t => {
	const output = renderToString(
		<Box aria-role="checkbox" aria-state={{checked: true}}>
			<Text>Accept terms</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'checkbox: (checked) Accept terms');
});

test('render with aria-state.disabled', t => {
	const output = renderToString(
		<Box aria-role="button" aria-state={{disabled: true}}>
			<Text>Submit</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'button: (disabled) Submit');
});

test('render with aria-state.expanded', t => {
	const output = renderToString(
		<Box aria-role="combobox" aria-state={{expanded: true}}>
			<Text>Select</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'combobox: (expanded) Select');
});

test('render with aria-state.multiline', t => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{multiline: true}}>
			<Text>Hello</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'textbox: (multiline) Hello');
});

test('render with aria-state.multiselectable', t => {
	const output = renderToString(
		<Box aria-role="listbox" aria-state={{multiselectable: true}}>
			<Text>Options</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'listbox: (multiselectable) Options');
});

test('render with aria-state.readonly', t => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{readonly: true}}>
			<Text>Hello</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'textbox: (readonly) Hello');
});

test('render with aria-state.required', t => {
	const output = renderToString(
		<Box aria-role="textbox" aria-state={{required: true}}>
			<Text>Name</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'textbox: (required) Name');
});

test('render with aria-state.selected', t => {
	const output = renderToString(
		<Box aria-role="option" aria-state={{selected: true}}>
			<Text>Blue</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'option: (selected) Blue');
});

test('render multi-line text', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Text>Line 1</Text>
			<Text>Line 2</Text>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Line 1\nLine 2');
});

test('render nested multi-line text', t => {
	const output = renderToString(
		<Box flexDirection="row">
			<Box flexDirection="column">
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Line 1\nLine 2');
});

test('render nested row', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box flexDirection="row">
				<Text>Line 1</Text>
				<Text>Line 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'Line 1 Line 2');
});

test('render multi-line text with roles', t => {
	const output = renderToString(
		<Box flexDirection="column" aria-role="list">
			<Box aria-role="listitem">
				<Text>Item 1</Text>
			</Box>
			<Box aria-role="listitem">
				<Text>Item 2</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(output, 'list: listitem: Item 1\nlistitem: Item 2');
});

test('render listbox with multiselectable options', t => {
	const output = renderToString(
		<Box
			flexDirection="column"
			aria-role="listbox"
			aria-state={{multiselectable: true}}
		>
			<Box aria-role="option" aria-state={{selected: true}}>
				<Text>Option 1</Text>
			</Box>
			<Box aria-role="option" aria-state={{selected: false}}>
				<Text>Option 2</Text>
			</Box>
			<Box aria-role="option" aria-state={{selected: true}}>
				<Text>Option 3</Text>
			</Box>
		</Box>,
		{
			isScreenReaderEnabled: true,
		},
	);

	t.is(
		output,
		'listbox: (multiselectable) option: (selected) Option 1\noption: Option 2\noption: (selected) Option 3',
	);
});
