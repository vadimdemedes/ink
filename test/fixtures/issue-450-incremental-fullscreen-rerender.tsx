import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Text, render, useApp} from '../../src/index.js';

function App({rows}: {readonly rows: number}) {
	const {exit} = useApp();
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		if (frame >= 8) {
			const timer = setTimeout(() => {
				exit();
			}, 0);

			return () => {
				clearTimeout(timer);
			};
		}

		const timer = setTimeout(() => {
			setFrame(prev => prev + 1);
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [exit, frame]);

	return (
		<Box height={rows} flexDirection="column">
			<Text>#450 top</Text>
			<Box flexGrow={1}>
				<Text>{`frame ${frame}`}</Text>
			</Box>
			<Text>#450 bottom</Text>
		</Box>
	);
}

const rows = Number(process.argv[2]) || 6;
process.stdout.rows = rows;

render(<App rows={rows} />, {incrementalRendering: true});
