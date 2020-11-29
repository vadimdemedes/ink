import * as React from 'react';
import {useEffect} from 'react';
import ua from 'universal-analytics';

import {
	MemoryRouter,
	Switch,
	Route,
	useHistory,
	useLocation
} from 'react-router';

import {Text, Newline, Box, useInput} from 'ink';

const visitor = ua('UA-00000000-0');

const App = () => {
	const history = useHistory();

	const location = useLocation();

	useEffect(() => {
		visitor.pageview(location.pathname + location.search).send();
	}, [location.pathname, location.search]);

	useInput((input, key) => {
		if (key.return) {
			history.push('/main');
		}

		if (input === 'h') {
			history.push('/help');
		}
	});

	return (
		<>
			<Switch>
				<Route path="/main">
					<Text>The main program executes here</Text>
				</Route>
				<Route path="/help">
					<Text>This is the help section</Text>
				</Route>
			</Switch>
			<Box margin={2}>
				<Text>
					<Text bold>Menu</Text>
					<Newline />
					<Text>Press h for help</Text>
					<Newline />
					<Text>Or press enter to continue</Text>
				</Text>
			</Box>
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
