/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import React, {useState, useEffect} from 'react';
import {
	render,
	Box,
	Text,
	useApp,
	useInput,
	useStdout,
} from '../../src/index.js';

function AlternateBufferExample() {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [time, setTime] = useState(new Date());
	const [exiting, setExiting] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			setTime(new Date());
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, []);

	useInput(input => {
		if (input === ' ') {
			setExiting(true);
		}
	});

	useEffect(() => {
		if (exiting) {
			exit();
		}
	}, [exiting]);

	// Intentionally set the height to 5 more than the terminal height to
	// illustrate robust alternate buffer edge case handling if the content
	// is too large. On exit you will see the entire content rendered to
	// the main buffer. Before that point content is clipped to the terminal
	// height.
	return (
		<Box
			borderStyle="single"
			width={stdout.columns}
			height={stdout.rows + 30}
			justifyContent="center"
			alignItems="center"
		>
			<Box flexDirection="column" alignItems="center">
				<Text>Press space to exit.</Text>
				{exiting ? (
					<Text>Exiting. Goodbye!</Text>
				) : (
					<Text>
						Time: {time.toLocaleTimeString()}.
						{time.getMilliseconds().toString().padStart(3, '0')}
					</Text>
				)}
			</Box>
		</Box>
	);
}

process.stdout.write('\u001B[?1049h');
render(<AlternateBufferExample />, {
	alternateBuffer: true,
	alternateBufferAlreadyActive: true,
});
