'use strict';
const React = require('react');
const {default: PQueue} = require('p-queue');
const delay = require('delay');
const ms = require('ms');
const importJsx = require('import-jsx');
const {Static, Box, render} = require('../..');

const Summary = importJsx('./summary');
const Test = importJsx('./test');

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
	'tests/comments.js'
];

class Jest extends React.Component {
	constructor() {
		super();

		this.state = {
			startTime: Date.now(),
			completedTests: [],
			runningTests: []
		};
	}

	render() {
		const {startTime, completedTests, runningTests} = this.state;

		return (
			<Box flexDirection="column">
				<Static>
					{completedTests.map(test => (
						<Test key={test.path} status={test.status} path={test.path}/>
					))}
				</Static>

				{runningTests.length > 0 && (
					<Box flexDirection="column" marginTop={1}>
						{runningTests.map(test => (
							<Test key={test.path} status={test.status} path={test.path}/>
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

	componentDidMount() {
		const queue = new PQueue({concurrency: 4});

		paths.forEach(path => {
			queue.add(this.runTest.bind(this, path));
		});
	}

	async runTest(path) {
		this.setState(prevState => ({
			runningTests: [
				...prevState.runningTests,
				{
					status: 'runs',
					path
				}
			]
		}));

		await delay(1000 * Math.random());

		this.setState(prevState => ({
			runningTests: prevState.runningTests.filter(test => test.path !== path),
			completedTests: [
				...prevState.completedTests,
				{
					status: Math.random() < 0.5 ? 'pass' : 'fail',
					path
				}
			]
		}));
	}
}

render(<Jest/>);
