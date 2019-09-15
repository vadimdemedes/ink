import {useLayoutEffect, useContext} from 'react';
import {StdinContext} from '..';

export default inputHandler => {
	const {stdin, setRawMode} = useContext(StdinContext);

	useLayoutEffect(() => {
		setRawMode(true);

		return () => setRawMode(false);
	}, [setRawMode]);

	useLayoutEffect(() => {
		const handleData = data => {
			const input = String(data);
			const meta = {
				up: input === '\u001B[A',
				down: input === '\u001B[B',
				left: input === '\u001B[D',
				right: input === '\u001B[C'
			};

			inputHandler(input, meta);
		};

		stdin.on('data', handleData);

		return () => stdin.off('data', handleData);
	}, [stdin, inputHandler]);
};
