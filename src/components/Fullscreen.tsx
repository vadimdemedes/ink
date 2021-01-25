import React, {FC, useState, useEffect} from 'react';
import Box from './Box';

const Fullscreen: FC = ({children}) => {
	const [size, setSize] = useState({
		columns: process.stdout.columns,
		rows: process.stdout.rows
	});

	useEffect(() => {
		function onResize() {
			setSize({
				columns: process.stdout.columns,
				rows: process.stdout.rows
			});
		}

		process.stdout.on('resize', onResize);
		process.stdout.write('\u001B[?1049h');
		return () => {
			process.stdout.off('resize', onResize);
			process.stdout.write('\u001B[?1049l');
		};
	}, []);

	return (
		<Box width={size.columns} height={size.rows}>
			{children}
		</Box>
	);
};

export default Fullscreen;
