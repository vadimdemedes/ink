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
			let input = String(data);
			const key = {
				upArrow: input === '\u001B[A',
				downArrow: input === '\u001B[B',
				leftArrow: input === '\u001B[D',
				rightArrow: input === '\u001B[C',
				return: input === '\r',
				escape: input === '\x1b',
				ctrl: false,
				shift: false
			};

			// Copied from `keypress` module
			if (input <= '\x1a') {
		    input = String.fromCharCode(input.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
		    key.ctrl = true;
		  }

			const isLatinUppercase = input >= 'A' && input <= 'Z'
			const isCyrillicUppercase = input => 'А' && input <= 'Я'
			if (input.length === 1 && (isLatinUppercase || isCyrillicUppercase)) {
			  key.shift = true;
			}

			inputHandler(input, key);
		};

		stdin.on('data', handleData);

		return () => {
			stdin.off('data', handleData);
		};
	}, [stdin, inputHandler]);
};
