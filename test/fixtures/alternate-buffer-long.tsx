/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect} from 'react';
import {render, Text, useApp, Box} from '../../src/index.js';

function AlternateBufferLong() {
	const {exit} = useApp();

	useEffect(() => {
		const timer = setTimeout(() => {
			exit();
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	return (
		<Box flexDirection="column">
			<Text>Line 1</Text>
			<Text>Line 2</Text>
			<Text>Line 3</Text>
			<Text>Line 4</Text>
			<Text>Line 5</Text>
		</Box>
	);
}

const {waitUntilExit} = render(<AlternateBufferLong />, {
	alternateBuffer: true,
});

await waitUntilExit();
