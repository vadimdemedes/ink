import React, {Suspense, act, startTransition} from 'react';
import test from 'ava';
import {render, Static, Text} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';
import {createStdin} from './helpers/create-stdin.js';

const never = new Promise<never>(() => {});

function Pending() {
	// eslint-disable-next-line @typescript-eslint/only-throw-error
	throw never;
}

function App({
	pending,
	items,
}: {
	readonly pending: boolean;
	readonly items: string[];
}) {
	return (
		<Suspense fallback={<Text>Loading</Text>}>
			<Static key={pending ? 'replacement' : 'original'} items={items}>
				{item => <Text key={item}>{item}</Text>}
			</Static>
			{pending ? <Pending /> : <Text>Live</Text>}
		</Suspense>
	);
}

test.serial(
	'abandoned transition render does not replace committed Static',
	async t => {
		const stdout = createStdout();
		const stdin = createStdin();

		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<App pending={false} items={['first']} />, {
				stdout,
				stdin,
				debug: true,
				concurrent: true,
				patchConsole: false,
			});
		});
		t.teardown(async () => {
			await act(async () => {
				instance.unmount();
			});
		});

		t.is(stdout.get(), 'first\nLive');

		// Start a transition that suspends with a keyed <Static> replacement, then
		// abandon it by committing a normal update without that replacement.
		await act(async () => {
			startTransition(() => {
				instance.rerender(<App pending items={['abandoned']} />);
			});
		});

		await act(async () => {
			instance.rerender(<App pending={false} items={['first', 'second']} />);
		});

		t.is(stdout.get(), 'first\nsecond\nLive');
	},
);
