import React from 'react';
import test from 'ava';
import {Box, Text, render, renderToString} from '../src/index.js';
import {type Styles} from '../src/styles.js';
import createStdout from './helpers/create-stdout.js';

const cases: Array<[string, Styles, Styles]> = [
	['column gap override removal', {gap: 2, columnGap: 4}, {gap: 2}],
	['row gap override removal', {gap: 2, rowGap: 4}, {gap: 2}],
	['gap removal', {gap: 3}, {}],
	['position offset removal', {position: 'relative', left: 2, top: 1}, {}],
	['absolute to flow', {position: 'absolute', left: 2, top: 1}, {}],
	['border removal', {borderStyle: 'single'}, {}],
	[
		'border side restoration',
		{borderStyle: 'single', borderLeft: false},
		{borderStyle: 'single'},
	],
	['alignSelf removal', {alignSelf: 'flex-end'}, {}],
	['flexBasis removal', {flexBasis: 12}, {}],
	['maxHeight removal', {maxHeight: 1}, {}],
	['height removal', {height: 4}, {}],
	['width removal', {width: 12}, {}],
	['minWidth removal', {minWidth: 12}, {}],
	['maxWidth removal', {maxWidth: 4}, {}],
	['aspectRatio removal', {aspectRatio: 2, width: 12}, {width: 12}],
];

for (const [name, before, after] of cases) {
	test(`rerender matches fresh layout after ${name}`, async t => {
		const view = (style: Styles) => (
			<Box width={30} height={12} flexDirection="column">
				<Box {...style}>
					<Text>Alpha</Text>
					<Text>Beta</Text>
				</Box>
				<Text>End</Text>
			</Box>
		);
		const stdout = createStdout(30);
		const instance = render(view(before), {
			stdout,
			debug: true,
			patchConsole: false,
		});
		t.teardown(instance.unmount);
		await instance.waitUntilRenderFlush();
		instance.rerender(view(after));
		await instance.waitUntilRenderFlush();

		t.is(stdout.get(), renderToString(view(after), {columns: 30}));
	});
}
