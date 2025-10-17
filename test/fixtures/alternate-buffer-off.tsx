/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect} from 'react';
import {render, Text, useApp} from '../../src/index.js';

function AlternateBufferOff() {
	const {exit} = useApp();

	useEffect(() => {
		// Exit after first render
		const timer = setTimeout(() => {
			exit();
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit]);

	return <Text>Hello World</Text>;
}

const {waitUntilExit} = render(<AlternateBufferOff />, {
	alternateBuffer: false,
});

await waitUntilExit();
