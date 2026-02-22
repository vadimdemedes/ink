import process from 'node:process';
import React, {
	useState,
	useTransition,
	useMemo,
	useEffect,
	useRef,
} from 'react';
import {render, Box, Text, useInput, useApp} from '../../src/index.js';

function App() {
	const {exit} = useApp();
	const [query, setQuery] = useState('abcde');
	const [, startTransition] = useTransition();
	const [deferredQuery, setDeferredQuery] = useState('abcde');
	const done = useRef(false);

	useInput((input, key) => {
		if (key.return) {
			if (done.current) {
				return;
			}

			done.current = true;
			process.stdout.write(
				`\nFINAL query:${JSON.stringify(query)} deferred:${JSON.stringify(deferredQuery)}\n`,
			);
			exit();
			return;
		}

		if (key.backspace || key.delete) {
			setQuery(previousQuery => previousQuery.slice(0, -1));
			startTransition(() => {
				setDeferredQuery(previousQuery => previousQuery.slice(0, -1));
			});
		}
	});

	const filteredResult = useMemo(() => {
		if (!deferredQuery) {
			return '';
		}

		// Simulate expensive computation that blocks the fiber
		const start = Date.now();
		while (Date.now() - start < 30) {
			// Artificial delay
		}

		return deferredQuery;
	}, [deferredQuery]);

	useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	return (
		<Box flexDirection="column">
			<Text>query:{query}</Text>
			<Text>deferred:{deferredQuery}</Text>
			<Text>filtered:{filteredResult}</Text>
		</Box>
	);
}

render(<App />, {concurrent: true});
