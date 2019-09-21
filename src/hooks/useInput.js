import {useLayoutEffect, useContext} from 'react';
import {StdinContext} from '..';

export default inputHandler => {
	const {stdin, setRawMode} = useContext(StdinContext);

	useLayoutEffect(() => {
		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [setRawMode]);

	useLayoutEffect(() => {
		const handleData = data => {
			const input = String(data);
			const key = {
				upArrow: input === '\u001B[A',
				downArrow: input === '\u001B[B',
				leftArrow: input === '\u001B[D',
				rightArrow: input === '\u001B[C'
			};

			inputHandler(input, key);
		};

		stdin.on('data', handleData);

		return () => {
			stdin.off('data', handleData);
		};
	}, [stdin, inputHandler]);
};
