'use strict';
const React = require('react');
const {render, Text, Box} = require('../..');
const childProcess = require('child_process');

const SubprocessOutput = () => {
	const [output, setOutput] = React.useState('');
	const [outputArray, setOutputArray] = React.useState([]);

	React.useEffect(() => {
		const subProcess = childProcess.spawn('ping', ['8.8.8.8']);

		subProcess.stdout.on('data', newOutput => {
			setOutput(newOutput.toString('ascii'));
		});
	}, [setOutput]);

	React.useEffect(() => {
		setOutputArray([...outputArray, output].slice(-5));
	}, [setOutputArray, output]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text>
				My <Text bold>ping</Text> output:
			</Text>
			{outputArray.map((output, i) => (
				<Box key={i} marginTop="1">
					<Text>{output}</Text>
				</Box>
			))}
		</Box>
	);
};

render(<SubprocessOutput />);
