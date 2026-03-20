import childProcess from 'node:child_process';
import React from 'react';
import stripAnsi from 'strip-ansi';
import {render, Text, Box} from '../../src/index.js';

function SubprocessOutput() {
	const [output, setOutput] = React.useState('');

	React.useEffect(() => {
		const subProcess = childProcess.spawn('npm', [
			'run',
			'example',
			'examples/jest',
		]);

		subProcess.stdout.on('data', (newOutput: Uint8Array) => {
			const lines = stripAnsi(new TextDecoder().decode(newOutput)).split('\n');
			setOutput(lines.slice(-5).join('\n'));
		});
	}, [setOutput]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text>Сommand output:</Text>
			<Box marginTop={1}>
				<Text>{output}</Text>
			</Box>
		</Box>
	);
}

render(<SubprocessOutput />);
