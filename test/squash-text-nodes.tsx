import test, {type TestContext} from 'node:test';
import React from 'react';
import {Text, Transform} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('nested transforms receive each explicit line with its line index', (t: TestContext) => {
	const output = renderToString(
		<Text>
			<Transform
				transform={(line, index) => line.replaceAll('x', () => String(index))}
			>
				<Text>{'xx\nxx'}</Text>
			</Transform>
		</Text>,
	);

	t.assert.strictEqual(output, '00\n11');
});

test('nested transform line indices do not depend on preceding siblings', (t: TestContext) => {
	const output = renderToString(
		<Text>
			prefix
			<Transform
				transform={(line, index) => line.replaceAll('x', () => String(index))}
			>
				<Text>xx</Text>
			</Transform>
		</Text>,
	);

	t.assert.strictEqual(output, 'prefix00');
});
