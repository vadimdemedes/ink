import * as React from 'react';

import {MemoryRouter, Switch, Route, useHistory} from 'react-router';

import {Box, Text} from 'ink';

import SelectInput from 'ink-select-input';

const App = () => {
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

export default () => {
	return (
		<MemoryRouter>
			<App />
		</MemoryRouter>
	);
};
