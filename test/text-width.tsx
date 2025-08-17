import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('wide characters do not add extra space inside fixed-width Box', t => {
	const output = renderToString(
		<Box flexDirection="column">
			<Box>
				<Box width={2}>
					<Text>🍔</Text>
				</Box>
				<Text>|</Text>
			</Box>
			<Box>
				<Box width={2}>
					<Text>⏳</Text>
				</Box>
				<Text>|</Text>
			</Box>
		</Box>,
	);

	const lines = output.split('\n');
	// Both lines should have the pipe directly after the 2-column box
	t.is(lines[0], '🍔|');
	t.is(lines[1], '⏳|');
});
