import test, {type TestContext} from 'node:test';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
	render,
	Box,
	Static,
	Text,
	useApp,
	type RenderOptions,
} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

const staticWrites = async (node: React.ReactNode, options: RenderOptions) => {
	const stdout = createStdout();
	const {waitUntilExit} = render(node, {
		stdout,
		patchConsole: false,
		isScreenReaderEnabled: false,
		...options,
	});
	await waitUntilExit();
	return stdout.getWrites().filter(write => write.includes('static'));
};

function ExitOnMount() {
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

for (const {name, options, expected} of [
	{
		name: 'interactive',
		options: {interactive: true},
		expected: ['static A\n'],
	},
	{
		name: 'non-interactive',
		options: {interactive: false},
		expected: ['static A\n'],
	},
	{
		name: 'screen reader',
		options: {interactive: true, isScreenReaderEnabled: true},
		expected: ['static A\n'],
	},
	{
		// Debug mode writes all static output followed by the frame on every render.
		name: 'debug',
		options: {debug: true},
		expected: ['static A\nlive', 'static A\nlive'],
	},
]) {
	test(`exit() from an effect writes <Static> output once (${name})`, async (t: TestContext) => {
		t.assert.deepStrictEqual(
			await staticWrites(<ExitOnMount />, options),
			expected,
		);
	});
}

function ExitOnUnmount() {
	const {exit} = useApp();

	useLayoutEffect(
		() => () => {
			exit();
		},
		[exit],
	);

	return <Text>working</Text>;
}

// The cleanup calls `exit()` while React is still committing the new item, before Ink has rendered it.
function ExitWhileAddingItem() {
	const [isDone, setIsDone] = useState(false);

	useEffect(() => {
		setIsDone(true);
	}, []);

	return (
		<>
			<Static items={isDone ? ['A', 'B'] : ['A']}>
				{item => <Text key={item}>static {item}</Text>}
			</Static>
			<Box>{!isDone && <ExitOnUnmount />}</Box>
		</>
	);
}

for (const {name, options, expected} of [
	{
		name: 'non-interactive',
		options: {interactive: false},
		expected: ['static A\n', 'static B\n'],
	},
	{
		name: 'screen reader',
		options: {interactive: true, isScreenReaderEnabled: true},
		expected: ['static A\n', 'static B\n'],
	},
	{
		name: 'debug',
		options: {debug: true},
		expected: ['static A\nworking', 'static A\nstatic B\nworking'],
	},
]) {
	test(`exit() during the commit that adds a <Static> item still writes the item (${name})`, async (t: TestContext) => {
		t.assert.deepStrictEqual(
			await staticWrites(<ExitWhileAddingItem />, options),
			expected,
		);
	});
}
