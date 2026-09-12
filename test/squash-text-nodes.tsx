import React from 'react';
import test from 'ava';
import {Text, Transform} from '../src/index.js';
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
