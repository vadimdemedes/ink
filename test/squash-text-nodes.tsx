import React from 'react';
import test from 'ava';
import {Text, Transform} from '../src/index.js';
import squashTextNodes from '../src/squash-text-nodes.js';
import {appendChildNode, createNode, createTextNode} from '../src/dom.js';
import {renderToString} from './helpers/render-to-string.js';

test('nested transforms receive each explicit line with its line index', t => {
	const output = renderToString(
		<Text>
			<Transform
				transform={(line, index) => line.replaceAll('x', String(index))}
			>
				<Text>{'xx\nxx'}</Text>
			</Transform>
		</Text>,
	);

	t.is(output, '00\n11');
});

test('nested transform line indices do not depend on preceding siblings', t => {
	const output = renderToString(
		<Text>
			prefix
			<Transform
				transform={(line, index) => line.replaceAll('x', String(index))}
			>
				<Text>xx</Text>
			</Transform>
		</Text>,
	);

	t.is(output, 'prefix00');
});

test('cursorOffset is preserved across nested nodes', t => {
	const rootText = createNode('ink-text');
	appendChildNode(rootText, createTextNode('root'));

	const parent = createNode('ink-virtual-text');
	appendChildNode(rootText, parent);
	appendChildNode(parent, createTextNode('pa'));

	const inner = createNode('ink-virtual-text');
	appendChildNode(parent, inner);
	appendChildNode(inner, createTextNode('in'));

	appendChildNode(parent, createTextNode('rent'));

	const child = createNode('ink-virtual-text');
	appendChildNode(parent, child);
	appendChildNode(child, createTextNode('before'));

	const cursor = createNode('ink-virtual-text');
	cursor.internal_cursorOffset = 0;
	appendChildNode(child, cursor);

	appendChildNode(child, createTextNode('after'));

	const {cursorOffset} = squashTextNodes(rootText);
	t.is(cursorOffset, 18);
});
