import {useEffect} from 'react';
import parseKeypress, {nonAlphanumericKeys} from '../parse-keypress.js';
import reconciler from '../reconciler.js';
import useStdin from './use-stdin.js';

/**
Handy information about a key that was pressed.
*/
export type Key = {
	/**
	Up arrow key was pressed.
	*/
	upArrow: boolean;

	/**
	Down arrow key was pressed.
	*/
	downArrow: boolean;

	/**
	Left arrow key was pressed.
	*/
	leftArrow: boolean;

	/**
	Right arrow key was pressed.
	*/
	rightArrow: boolean;

	/**
	Page Down key was pressed.
	*/
	pageDown: boolean;

	/**
	Page Up key was pressed.
	*/
	pageUp: boolean;

	/**
	Home key was pressed.
	*/
	home: boolean;

	/**
	End key was pressed.
	*/
	end: boolean;

	/**
	Return (Enter) key was pressed.
	*/
	return: boolean;

	/**
	Escape key was pressed.
	*/
	escape: boolean;

	/**
	Ctrl key was pressed.
	*/
	ctrl: boolean;

	/**
	Shift key was pressed.
	*/
	shift: boolean;

	/**
	Tab key was pressed.
	*/
	tab: boolean;

	/**
	Backspace key was pressed.
	*/
	backspace: boolean;

	/**
	Delete key was pressed.
	*/
	delete: boolean;

	/**
	[Meta key](https://en.wikipedia.org/wiki/Meta_key) was pressed.
	*/
	meta: boolean;
};

type Handler = (input: string, key: Key) => void;

type Options = {
	/**
	Enable or disable capturing of user input. Useful when there are multiple `useInput` hooks used at once to avoid handling the same input several times.

	@default true
	*/
	isActive?: boolean;
};

/**
This hook is used for handling user input. It's a more convenient alternative to using `StdinContext` and listening for `data` events. The callback you pass to `useInput` is called for each character when the user enters any input. However, if the user pastes text and it's more than one character, the callback will be called only once, and the whole string will be passed as `input`.

```
import {useInput} from 'ink';

const UserInput = () => {
  useInput((input, key) => {
    if (input === 'q') {
      // Exit program
    }

    if (key.leftArrow) {
      // Left arrow key pressed
    }
  });

  return …
};
```
*/
const useInput = (inputHandler: Handler, options: Options = {}) => {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const {stdin, setRawMode, internal_exitOnCtrlC, internal_eventEmitter} =
		useStdin();

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

		const handleData = (data: string) => {
			const keypress = parseKeypress(data);

			const key = {
				upArrow: keypress.name === 'up',
				downArrow: keypress.name === 'down',
				leftArrow: keypress.name === 'left',
				rightArrow: keypress.name === 'right',
				pageDown: keypress.name === 'pagedown',
				pageUp: keypress.name === 'pageup',
				home: keypress.name === 'home',
				end: keypress.name === 'end',
				return: keypress.name === 'return',
				escape: keypress.name === 'escape',
				ctrl: keypress.ctrl,
				shift: keypress.shift,
				tab: keypress.name === 'tab',
				backspace: keypress.name === 'backspace',
				delete: keypress.name === 'delete',
				// `parseKeypress` parses \u001B\u001B[A (meta + up arrow) as meta = false
				// but with option = true, so we need to take this into account here
				// to avoid breaking changes in Ink.
				// TODO(vadimdemedes): consider removing this in the next major version.
				meta: keypress.meta || keypress.name === 'escape' || keypress.option,
			};

			let input = keypress.ctrl ? keypress.name : keypress.sequence;

			if (nonAlphanumericKeys.includes(keypress.name)) {
				input = '';
			}

			// Strip meta if it's still remaining after `parseKeypress`
			// TODO(vadimdemedes): remove this in the next major version.
			if (input.startsWith('\u001B')) {
				input = input.slice(1);
			}

			if (
				input.length === 1 &&
				typeof input[0] === 'string' &&
				/[A-Z]/.test(input[0])
			) {
				key.shift = true;
			}

			// If app is not supposed to exit on Ctrl+C, then let input listener handle it
			if (!(input === 'c' && key.ctrl) || !internal_exitOnCtrlC) {
				// @ts-expect-error TypeScript types for `batchedUpdates` require an argument, but React's codebase doesn't provide it and it works without it as expected.
				reconciler.batchedUpdates(() => {
					inputHandler(input, key);
				});
			}
		};

		internal_eventEmitter?.on('input', handleData);

		return () => {
			internal_eventEmitter?.removeListener('input', handleData);
		};
	}, [options.isActive, stdin, internal_exitOnCtrlC, inputHandler]);
};

export default useInput;
