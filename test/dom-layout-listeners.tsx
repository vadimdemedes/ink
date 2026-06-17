import React, {useRef} from 'react';
import test from 'ava';
import delay from 'delay';
import {Box, Text, render, useBoxMetrics} from '../src/index.js';
import {
	addLayoutListener,
	createNode,
	emitLayoutListeners,
	type DOMElement,
} from '../src/dom.js';
import createStdout from './helpers/create-stdout.js';

test('layout listener feedback loop does not exceed React update depth', async t => {
	// A box whose rendered height tracks its measured height creates a layout
	// feedback loop: every commit re-measures, schedules state, and commits
	// again. If listeners run synchronously inside React's commit, this recurses
	// until React throws "Maximum update depth exceeded". The listener must be
	// deferred out of the commit stack so each step is a normal update.
	function GrowingBox() {
		const ref = useRef<DOMElement>(null);
		const {height} = useBoxMetrics(ref);
		const lineCount = Math.min(height + 1, 60);

		return (
			<Box ref={ref} flexDirection="column">
				{Array.from({length: lineCount}, (_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<Text key={index}>line {index + 1}</Text>
				))}
			</Box>
		);
	}

	await t.notThrowsAsync(async () => {
		const app = render(<GrowingBox />, {stdout: createStdout(100)});
		await delay(100);
		app.unmount();
		await app.waitUntilExit();
	});
});

test('removed layout listeners do not run after a pending emit', async t => {
	const rootNode = createNode('ink-root');
	const events: string[] = [];

	const removeListener = addLayoutListener(rootNode, () => {
		events.push('listener');
	});

	emitLayoutListeners(rootNode);
	removeListener();

	await Promise.resolve();

	t.deepEqual(events, []);
});
