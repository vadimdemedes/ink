/* This examples relies on the external packages `react-router` and `ink-select-input` */
'use strict';
const React = require('react');
const {Box, Text} = require('ink');

const {MemoryRouter, Switch, Route, useHistory} = require('react-router');
const SelectInput = require('ink-select-input').default;

const Main = () => {
	const history = useHistory();

	const items = [
		{
			label: 'Run Program',
			value: '/main'
		},
		{
			label: 'Help',
			value: '/help'
		},
		{
			label: 'Configuration',
			value: '/configuration'
		}
	];

	const handleSelect = item => {
		if (item.value.startsWith('/')) {
			history.push(item.value);
		}
	};

	return (
		<>
			<Switch>
				<Route path="/main">
					<Text>The main program executes here</Text>
				</Route>
				<Route path="/help">
					<Text>This is the help section</Text>
				</Route>
				<Route path="/configuration">
					<Text>Some configuration settings here</Text>
				</Route>
			</Switch>
			<Box margin={2}>
				<Text bold>Menu.</Text>
			</Box>
			<SelectInput items={items} onSelect={handleSelect} />
		</>
	);
};

const App = () => {
	return (
		<MemoryRouter>
			<Main />
		</MemoryRouter>
	);
};

module.exports = App;

/* Render(<App/>); */
