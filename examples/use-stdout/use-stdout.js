'use strict';
const React = require('react');
const {render, Box, Text, useStdout} = require('../..');

const Example = () => {
	const {stdout, write} = useStdout();

	React.useEffect(() => {
		const timer = setInterval(() => {
			write('Hello from Ink to stdout\n');
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Text bold underline>
				Terminal dimensions:
			</Text>

			<Box marginTop={1}>
				<Text>
					Width: <Text bold>{stdout.columns}</Text>
				</Text>
			</Box>
			<Box>
				<Text>
					Height: <Text bold>{stdout.rows}</Text>
				</Text>
			</Box>
		</Box>
	);
};

render(<Example />);
