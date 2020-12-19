'use strict';
const React = require('react');
const stripAnsi = require('strip-ansi');
const {render, Text, Box} = require('../..');
const childProcess = require('child_process');

const SubprocessOutput = () => {
	const [output, setOutput] = React.useState('');

	React.useEffect(() => {
		const subProcess = childProcess.spawn('traceroute', ['google.com']);

		subProcess.stdout.on('data', newOutput => {
			const lines = stripAnsi(newOutput.toString('utf8')).split('\n');
			setOutput(lines.slice(0, 5).join('\n'));
		});
	}, [setOutput]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text>
				My <Text bold>ping</Text> output:
			</Text>
			<Box marginTop="1">
				<Text>{output}</Text>
			</Box>
		</Box>
	);
};

render(<SubprocessOutput />);
