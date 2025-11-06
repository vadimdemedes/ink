import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

const tsExample = `import React, {useState, useEffect} from 'react';
import {render, Box, Text, useInput} from 'ink';

// This is a simple counter component to demonstrate standard text wrapping capabilities within Ink.
// Try resizing your terminal window to see how this long comment and the code below adapts to different widths.
// Long lines without spaces might cause interesting behavior depending on the wrap mode, but here we have standard code.

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box borderStyle="round" borderColor="green">
      <Text color="green">
        Running for {count * 100}ms. This text should also wrap if the terminal is narrow enough, just like standard text in a terminal.
      </Text>
    </Box>
  );
}

render(<Counter />);`;

const widths = [14, 15, 30, 45, 60, 75];

for (const width of widths) {
	test(`text wrap - width ${width}`, t => {
		const output = renderToString(
			<Box width={width} borderStyle="single">
				<Text>{tsExample}</Text>
			</Box>,
		);
		t.snapshot(output);
	});
}

for (const width of widths) {
	test(`text wrap with line numbers - width ${width}`, t => {
		const output = renderToString(
			<Box width={width} flexDirection="column" borderStyle="single">
				{tsExample.split('\n').map((line, i) => (
					// eslint-disable-next-line react/no-array-index-key
					<Box key={i} flexDirection="row">
						<Box width={3} flexShrink={0} flexGrow={0}>
							<Text>{i + 1}</Text>
						</Box>
						<Text>{line}</Text>
					</Box>
				))}
			</Box>,
		);
		t.snapshot(output);
	});
}

test('preserves leading spaces after newline when wrapping', t => {
	const text = 'Line 1\n  Line 2 (indented)';
	const output = renderToString(
		<Box width={20}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.true(
		output.includes('  Line 2 (indented)'),
		'Output should contain indented line 2',
	);
	t.is(output, 'Line 1\n  Line 2 (indented)');
});

test('preserves leading spaces when wrapping occurs naturally', t => {
	const text = 'A long line that will wrap around\n  Line 2 (indented)';
	const output = renderToString(
		<Box width={10}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.true(
		output.includes('\n  Line 2'),
		'Output should preserve indentation after explicit newline even when previous lines wrapped',
	);
});

test('preserves space before long word that wraps', t => {
	const text = 'foo thiistherestofalonglinethatneedstowrap';
	const output = renderToString(
		<Box width={10}>
			<Text wrap="wrap">{text}</Text>
		</Box>,
	);

	t.is(output, 'foo\nthiisthere\nstofalongl\ninethatnee\ndstowrap');
});
