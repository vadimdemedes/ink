import {useEffect, useContext} from 'react';
import {StdinContext} from '..';

export interface Key {
	upArrow: boolean;
	downArrow: boolean;
	leftArrow: boolean;
	rightArrow: boolean;
	return: boolean;
	escape: boolean;
	ctrl: boolean;
	shift: boolean;
	meta: boolean;
}

const useInput = (inputHandler: (input: string, key: Key) => void) => {
	const {stdin, setRawMode} = useContext(StdinContext);

	useEffect(() => {
		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [setRawMode]);

	useEffect(() => {
		const handleData = (data: Buffer) => {
			let input = String(data);
			const key = {
				upArrow: input === '\u001B[A',
				downArrow: input === '\u001B[B',
				leftArrow: input === '\u001B[D',
				rightArrow: input === '\u001B[C',
				return: input === '\r',
				escape: input === '\u001B',
				ctrl: false,
				shift: false,
				meta: false
			};

			// Copied from `keypress` module
			if (input <= '\u001A' && !key.return) {
				input = String.fromCharCode(
					input.charCodeAt(0) + 'a'.charCodeAt(0) - 1
				);
				key.ctrl = true;
			}

			if (input.startsWith('\u001B')) {
				input = input.slice(1);
				key.meta = true;
			}

			const isLatinUppercase = input >= 'A' && input <= 'Z';
			const isCyrillicUppercase = input >= 'А' && input <= 'Я';
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

export default useInput;
