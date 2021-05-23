import {useEffect} from 'react';
import readline, {Key as KeyInfo} from 'readline';
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

		if (stdin) {
			readline.emitKeypressEvents(stdin);
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

		const handleKeyPress = (data: string, keyInfo: KeyInfo) => {
			let input = '';

			if ((keyInfo.ctrl || keyInfo.meta) && keyInfo.name) {
				input = keyInfo.name;
			} else {
				input = String(data);
			}

			if (keyInfo.meta && keyInfo.shift) {
				// If caps lock is on, then `shift` will be true on `meta` events
				input = input.toUpperCase();
			}

			const key = {
				upArrow: keyInfo.name === 'up',
				downArrow: keyInfo.name === 'down',
				leftArrow: keyInfo.name === 'left',
				rightArrow: keyInfo.name === 'right',
				pageDown: keyInfo.name === 'pagedown',
				pageUp: keyInfo.name === 'pageup',
				return: input === 'return',
				escape: keyInfo.name === 'escape',
				ctrl: keyInfo.ctrl ?? false,
				shift: keyInfo.shift ?? false,
				tab: keyInfo.name === 'tab',
				// Replacing Node's version of '\u007F' from `backspace` to `delete`:
				// https://github.com/nodejs/node/blob/54dfdbcccf1f2844974bdcdedbfa1f45d75c55d5/lib/internal/readline/utils.js#L328
				backspace: keyInfo.name === 'backspace' && input !== '\u007F',
				delete: keyInfo.name === 'delete' || input === '\u007F',
				meta: keyInfo.meta ?? false
			};

			if (key.tab || key.backspace || key.delete) {
				input = '';
			}

			// If app is not supposed to exit on Ctrl+C, then let input listener handle it
			if (!(input === 'c' && key.ctrl) || !internal_exitOnCtrlC) {
				inputHandler(input, key);
			}
		};

		stdin?.on('keypress', handleKeyPress);

		return () => {
			stdin?.off('keypress', handleKeyPress);
		};
	}, [options.isActive, stdin, internal_exitOnCtrlC, inputHandler]);
};

export default useInput;
