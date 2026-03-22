import React, {useState, useEffect, useCallback} from 'react';
import PQueue from 'p-queue';
import delay from 'delay';
import ms from 'ms';
import {Static, Box, render} from '../../src/index.js';
import Summary from './summary.jsx';
import Test from './test.js';

const paths = [
	'tests/login.js',
	'tests/signup.js',
	'tests/forgot-password.js',
	'tests/reset-password.js',
	'tests/view-profile.js',
	'tests/edit-profile.js',
	'tests/delete-profile.js',
	'tests/posts.js',
	'tests/post.js',
	'tests/comments.js',
];

type TestResult = {
	path: string;
	status: string;
};

function Jest() {
	const [startTime, setStartTime] = useState(Date.now);
	const [completedTests, setCompletedTests] = useState<TestResult[]>([]);
	const [runningTests, setRunningTests] = useState<TestResult[]>([]);

	const runTest = useCallback(async (path: string) => {
		setRunningTests(previous => [
			...previous,
			{
				status: 'runs',
				path,
			},
		]);

		await delay(1000 * Math.random());

		setRunningTests(previous => previous.filter(test => test.path !== path));
		setCompletedTests(previous => [
			...previous,
			{
				status: Math.random() < 0.5 ? 'pass' : 'fail',
				path,
			},
		]);
	}, []);

	useEffect(() => {
		const queue = new PQueue({concurrency: 4});

		for (const path of paths) {
			void queue.add(async () => runTest(path));
		}
	}, [runTest]);

	return (
		<Box flexDirection="column">
			<Static items={completedTests}>
				{test => <Test key={test.path} status={test.status} path={test.path} />}
			</Static>

			{runningTests.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					{runningTests.map(test => (
						<Test key={test.path} status={test.status} path={test.path} />
					))}
				</Box>
			)}

			<Summary
				isFinished={runningTests.length === 0}
				passed={completedTests.filter(test => test.status === 'pass').length}
				failed={completedTests.filter(test => test.status === 'fail').length}
				time={ms(Date.now() - startTime)}
			/>
		</Box>
	);
}

render(<Jest />);
