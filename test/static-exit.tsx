import test, {type TestContext} from 'node:test';
import React, {useEffect} from 'react';
import {render, Static, Text, useApp} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

function Example() {
	const {exit} = useApp();

	useEffect(() => {
		exit();
	}, [exit]);

	return (
		<>
			<Static items={['A']}>
				{item => <Text key={item}>static {item}</Text>}
			</Static>
			<Text>live</Text>
		</>
	);
}

for (const {name, options, staticWrites} of [
	{
		name: 'interactive',
		options: {interactive: true},
		staticWrites: ['static A\n'],
	},
	{
		name: 'non-interactive',
		options: {interactive: false},
		staticWrites: ['static A\n'],
	},
	{
		name: 'screen reader',
		options: {interactive: true, isScreenReaderEnabled: true},
		staticWrites: ['static A\n'],
	},
	{
		// Debug mode writes all static output followed by the frame on every render.
		name: 'debug',
		options: {debug: true},
		staticWrites: ['static A\nlive', 'static A\nlive'],
	},
]) {
	test(`exit() from an effect writes <Static> output once (${name})`, async (t: TestContext) => {
		const stdout = createStdout();
		const {waitUntilExit} = render(<Example />, {
			stdout,
			patchConsole: false,
			isScreenReaderEnabled: false,
			...options,
		});
		await waitUntilExit();

		t.assert.deepStrictEqual(
			stdout.getWrites().filter(write => write.includes('static A')),
			staticWrites,
		);
	});
}
