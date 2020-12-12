import {useEffect} from 'react';
import useStdin from './use-stdin';

/**
 * Handy information about a key that was pressed.
 */
export interface Key {
	/**
	 * Up arrow key was pressed.
	 */
	upArrow: boolean;

	/**
	 * Down arrow key was pressed.
	 */
	downArrow: boolean;

	/**
	 * Left arrow key was pressed.
	 */
	leftArrow: boolean;

	/**
	 * Right arrow key was pressed.
	 */
	rightArrow: boolean;

	/**
	 * Page Down key was pressed.
	 */
	pageDown: boolean;

	/**
	 * Page Up key was pressed.
	 */
	pageUp: boolean;

	/**
	 * Return (Enter) key was pressed.
	 */
	return: boolean;

	/**
	 * Escape key was pressed.
	 */
	escape: boolean;

	/**
	 * Ctrl key was pressed.
	 */
	ctrl: boolean;

	/**
	 * Shift key was pressed.
	 */
	shift: boolean;

	/**
	 * Tab key was pressed.
	 */
	tab: boolean;

	/**
	 * Backspace key was pressed.
	 */
	backspace: boolean;

	/**
	 * Delete key was pressed.
	 */
	delete: boolean;

	/**
	 * [Meta key](https://en.wikipedia.org/wiki/Meta_key) was pressed.
	 */
	meta: boolean;
}

type Handler = (input: string, key: Key) => void;

interface Options {
	/**
	 * Enable or disable capturing of user input.
	 * Useful when there are multiple useInput hooks used at once to avoid handling the same input several times.
	 *
	 * @default true
	 */
	isActive?: boolean;
}

/**
 * This hook is used for handling user input.
 * It's a more convenient alternative to using `StdinContext` and listening to `data` events.
 * The callback you pass to `useInput` is called for each character when user enters any input.
 * However, if user pastes text and it's more than one character, the callback will be called only once and the whole string will be passed as `input`.
 *
 * ```
 * import {useInput} from 'ink';
 *
 * const UserInput = () => {
 *   useInput((input, key) => {
 *     if (input === 'q') {
 *       // Exit program
 *     }
 *
 *     if (key.leftArrow) {
 *       // Left arrow key pressed
 *     }
 *   });
 *
 *   return …
 * };
 * ```
 */
const useInput = (inputHandler: Handler, options: Options = {}) => {
	const {stdin, setRawMode, internal_exitOnCtrlC} = useStdin();

	useEffect(() => {
		if (options.isActive === false) {
			return;
		}

		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	}, [options.isActive, setRawMode]);

	useEffect(() => {
		if (options.isActive === false) {
			return;
		}

		const handleData = (data: Buffer) => {
			let input = String(data);

			const key = {
				upArrow: input === '\u001B[A',
				downArrow: input === '\u001B[B',
				leftArrow: input === '\u001B[D',
				rightArrow: input === '\u001B[C',
				pageDown: input === '\u001B[6~',
				pageUp: input === '\u001B[5~',
				return: input === '\r',
				escape: input === '\u001B',
				ctrl: false,
				shift: false,
				tab: input === '\t' || input === '\u001B[Z',
				backspace: input === '\u0008',
				delete: input === '\u007F' || input === '\u001B[3~',
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

			// Shift+Tab
			if (key.tab && input === '[Z') {
				key.shift = true;
			}

			if (key.tab || key.backspace || key.delete) {
				input = '';
			}

			// If app is not supposed to exit on Ctrl+C, then let input listener handle it
			if (!(input === 'c' && key.ctrl) || !internal_exitOnCtrlC) {
				inputHandler(input, key);
			}
		};

		stdin?.on('data', handleData);

		return () => {
			stdin?.off('data', handleData);
		};
	}, [options.isActive, stdin, internal_exitOnCtrlC, inputHandler]);
};

export default useInput;
