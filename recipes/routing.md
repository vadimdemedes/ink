# Routing with React Router

[React Router](https://reactrouter.com) can be used for routing in Ink apps via its [`MemoryRouter`](https://reactrouter.com/api/declarative-routers/MemoryRouter). Unlike `BrowserRouter`, `MemoryRouter` doesn't rely on the browser's history API, storing the navigation stack in memory instead — which is exactly what a terminal app needs.

```tsx
import React from 'react';
import {MemoryRouter, Routes, Route, useNavigate} from 'react-router';
import {render, useInput, Text} from 'ink';

function Home() {
	const navigate = useNavigate();

	useInput((input, key) => {
		if (key.return) {
			navigate('/about');
		}
	});

	return <Text>Home. Press Enter to go to About.</Text>;
}

function About() {
	const navigate = useNavigate();

	useInput((input, key) => {
		if (key.return) {
			navigate('/');
		}
	});

	return <Text>About. Press Enter to go back Home.</Text>;
}

function App() {
	return (
		<MemoryRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/about" element={<About />} />
			</Routes>
		</MemoryRouter>
	);
}

render(<App />);
```

Things to keep in mind:

- `<Link>` can't be used in Ink since it renders an `<a>` tag. Use the `useNavigate` hook for all navigation instead.
- `MemoryRouter` starts at `"/"` by default. Set the `initialEntries` prop to start at a different route.
- Terminal routing is an abstraction for conditional rendering — routes aren't URLs, they're just screen states.

See [`examples/router`](/examples/router) for a working example.
