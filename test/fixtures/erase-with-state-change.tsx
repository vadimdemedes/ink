import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Text, render} from '../../src/index.js';

function Erase() {
	const [show, setShow] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setShow(false);
		});

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<Box flexDirection="column">
			{show && (
				<>
					<Text>A</Text>
					<Text>B</Text>
					<Text>C</Text>
				</>
			)}
		</Box>
	);
}

process.stdout.rows = Number(process.argv[2]);
render(<Erase />);
