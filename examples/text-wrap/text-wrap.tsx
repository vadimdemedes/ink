/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {render, Box, Text, useInput} from '../../src/index.js';

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

function TextWrap() {
	const [width, setWidth] = useState(60);

	useInput((input, key) => {
		if (key.leftArrow) {
			setWidth(w => Math.max(1, w - 1));
		}

		if (key.rightArrow) {
			setWidth(w => w + 1);
		}
	});

	return (
		<Box flexDirection="column">
			<Box width={width} borderStyle="single" marginBottom={1}>
				<Text>{tsExample}</Text>
			</Box>
			<Box
				width={width}
				flexDirection="column"
				borderStyle="single"
				overflow="hidden"
			>
				{tsExample.split('\n').map((line, i) => {
					const leadingSpaces = /^\s*/.exec(line)?.[0] ?? '';
					const trimmedLine = line.slice(leadingSpaces.length);

					return (
						// eslint-disable-next-line react/no-array-index-key
						<Box key={i} flexDirection="row">
							<Box width={3 + leadingSpaces.length} flexShrink={0} flexGrow={0}>
								<Text>{i + 1}</Text>
							</Box>
							<Text>{trimmedLine}</Text>
						</Box>
					);
				})}
			</Box>
			<Box marginTop={1}>
				<Text>
					Width: <Text color="green">{width}</Text> | Press{' '}
					<Text color="cyan">Left Arrow</Text> to shrink,{' '}
					<Text color="cyan">Right Arrow</Text> to increase. Press{' '}
					<Text color="red">Ctrl+C</Text> to exit.
				</Text>
			</Box>
		</Box>
	);
}

render(<TextWrap />);
