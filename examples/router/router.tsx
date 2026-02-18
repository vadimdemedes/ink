import React from 'react';
import {MemoryRouter, Routes, Route, useNavigate} from 'react-router';
import {render, useInput, useApp, Box, Text} from '../../src/index.js';

function Home() {
	const {exit} = useApp();
	const navigate = useNavigate();

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (key.return) {
			void navigate('/about');
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold color="green">
				Home
			</Text>
			<Text>Press Enter to go to About, or "q" to quit.</Text>
		</Box>
	);
}

function About() {
	const {exit} = useApp();
	const navigate = useNavigate();

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (key.return) {
			void navigate('/');
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold color="blue">
				About
			</Text>
			<Text>Press Enter to go back Home, or "q" to quit.</Text>
		</Box>
	);
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
