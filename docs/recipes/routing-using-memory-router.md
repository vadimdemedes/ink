# Recipe : Routing using MemoryRouter

If you desire to mirror the routing of a browser React app, the package `react-router` provides the useful `MemoryRouter`. 

## Pattern

The following example provides a basic implementation using `history.push` to trigger router state changes.

```jsx
import * as React from 'react';

import { MemoryRouter, Switch, Route, useHistory } from 'react-router';

import { Text, Box, useInput } from 'ink';

const App = () => {

	/* To consume the history api, we need this component to be a descendent of MemoryRouter.*/

	const history = useHistory();

	useInput((input, key) => {
		if (key.return) {
			history.push('/main');
		};
		if (input === 'h') {
			history.push('/help');
		};
	});
	
	return(
		<>
			<Switch>
				<Route path='/main'>
					<Text>The main program executes here</Text>
				</Route>
				<Route path='/help'>
					<Text>Help and documentation</Text>
				</Route>
			</Switch>
			<Box margin={2}>
				<Text>
					Press h for help or press enter to continue
				</Text>
			</Box>
		</>
	);
};

/* Ensuring MemoryRouter is provided at a higher level of the tree. This can be in a separate file */

export default (props) => {
	return(
		<MemoryRouter>
				<App {...props}/>
		</MemoryRouter>
	);
};
```

For actual use, the additional package [ink-select-input](https://github.com/vadimdemedes/ink-select-input) with `history.push` is an efficient way to provide routing to your Ink app. [Example](examples/router/select-input.js).

It is important to have in mind routing done following this pattern in Ink should not be mistaken for browser-based url-routing. Terminal-based routing is merely an abstraction layer to provide conditional rendering to your Ink application while keeping the same API you are familiar with. Subsequently, it is recommended not to call the routes' children 'Pages' in the same way the terminal is not a Browser. A better naming pattern would be to call the routes' children 'Sections'.

Keep in mind :
- `Link` from the `react-router` package cannot be used in Ink since we do not render in the DOM.
- All navigation should be done using the `history` object returned from the `useHistory` hook, for instance using `history.push` or `history.goBack`. For all available methods, please refer to the [react-router API Reference](https://reactrouter.com/core/api/history).
- By default, MemoryRouter instantiates a history using `createMemoryHistory` with the intial path stack `['/']`. It is recommended to be aware of this behaviour. You can change the initial path stack by providing a [custom history object](https://github.com/ReactTraining/history/blob/master/docs/api-reference.md#creatememoryhistory) to the Router component. 

## Examples

- [Router with Select Input](examples/router/select-input.js) - Menu-based navigation using MemoryRouter and [ink-select-input](https://github.com/vadimdemedes/ink-select-input).
