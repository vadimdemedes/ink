import test from 'ava';
import {
	addLayoutListener,
	createNode,
	emitLayoutListeners,
} from '../src/dom.js';

test('layout listeners run after the current commit stack', async t => {
	const rootNode = createNode('ink-root');
	const events: string[] = [];

	addLayoutListener(rootNode, () => {
		events.push('listener');
	});

	emitLayoutListeners(rootNode);
	events.push('after emit');

	t.deepEqual(events, ['after emit']);

	await Promise.resolve();

	t.deepEqual(events, ['after emit', 'listener']);
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
