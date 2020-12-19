'use strict';
const React = require('react');
const {render, Text, Box} = require('../../build');
const childProcess = require('child_process');

const SubprocessOutput = () => {
	const [output, setOutput] = React.useState('');

	React.useEffect(() => {
		const subProcess = childProcess.spawn('ping', ['8.8.8.8']).stdout;

		subProcess.on('data', newOutput => {
			setOutput(newOutput.toString('ascii'));
		});
	}, [setOutput]);

	return (
		<Box flexDirection="column">
			<Text>My ping output:</Text>
			<Text>{output}</Text>
		</Box>
	);
};

render(<SubprocessOutput />);
