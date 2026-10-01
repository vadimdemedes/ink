import childProcess from 'node:child_process';
import React from 'react';
import stripAnsi from 'strip-ansi';
import {render, Text, Box} from '../../src/index.js';

function SubprocessOutput() {
	const [output, setOutput] = React.useState('');

	React.useEffect(() => {
		const subprocess = childProcess.spawn('npm', [
			'run',
			'example',
			'examples/jest',
		]);

		subprocess.on('error', error => {
			setOutput(error.message);
		});

		subprocess.stdout.setEncoding('utf8');
		subprocess.stdout.on('data', (newOutput: string) => {
			setOutput(previousOutput =>
				(previousOutput + newOutput).split('\n').slice(-5).join('\n'),
			);
		});
	}, [setOutput]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text>Command output:</Text>
			<Box marginTop={1}>
				<Text>{stripAnsi(output)}</Text>
			</Box>
		</Box>
	);
}

render(<SubprocessOutput />);
