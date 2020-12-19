'use strict';
const childProcess = require('child_process');
const React = require('react');
const stripAnsi = require('strip-ansi');
const {render, Text, Box} = require('../..');

const SubprocessOutput = () => {
	const [output, setOutput] = React.useState('');

	React.useEffect(() => {
		const subProcess = childProcess.spawn('node', ['examples/jest']);

		subProcess.stdout.on('data', newOutput => {
			const lines = stripAnsi(newOutput.toString('utf8')).split('\n');
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
};

render(<SubprocessOutput />);
