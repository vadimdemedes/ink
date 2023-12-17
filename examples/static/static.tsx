import React from 'react';
import {Box, Text, render, Static} from '../../src/index.js';

function Example() {
	const [tests, setTests] = React.useState<
		Array<{
			id: number;
			title: string;
		}>
	>([]);

	React.useEffect(() => {
		let completedTests = 0;
		let timer: NodeJS.Timeout | undefined;

		const run = () => {
			if (completedTests++ < 10) {
				setTests(previousTests => [
					...previousTests,
					{
						id: previousTests.length,
						title: `Test #${previousTests.length + 1}`,
					},
				]);

				timer = setTimeout(run, 100);
			}
		};

		run();

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<>
			<Static items={tests}>
				{test => (
					<Box key={test.id}>
						<Text color="green">✔ {test.title}</Text>
					</Box>
				)}
			</Static>

			<Box marginTop={1}>
				<Text dimColor>Completed tests: {tests.length}</Text>
			</Box>
		</>
	);
}

render(<Example />);
