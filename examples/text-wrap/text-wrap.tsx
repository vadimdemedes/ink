/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState, useEffect} from 'react';
import {render, Box, Text, useStdout} from '../../src/index.js';

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
	const {stdout} = useStdout();
	const [size, setSize] = useState({
		columns: stdout.columns,
		rows: stdout.rows,
	});
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCounter(previous => previous + 1);
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		const onResize = () => {
			setSize({
				columns: stdout.columns,
				rows: stdout.rows,
			});
		};

		stdout.on('resize', onResize);
		return () => {
			stdout.off('resize', onResize);
		};
	}, [stdout]);

	return (
		<Box flexDirection="column">
			<Box width={size.columns} borderStyle="single" marginBottom={1}>
				<Text>{tsExample}</Text>
			</Box>
			<Box width={size.columns} flexDirection="column" borderStyle="single">
				{tsExample.split('\n').map((line, i) => (
					// eslint-disable-next-line react/no-array-index-key
					<Box key={i} flexDirection="row">
						<Box width={3} flexShrink={0} flexGrow={0}>
							<Text>{i + 1}</Text>
						</Box>
						<Text>{line}</Text>
					</Box>
				))}
			</Box>
			<Text>Running for {counter * 100}ms</Text>
		</Box>
	);
}

render(<TextWrap />);
