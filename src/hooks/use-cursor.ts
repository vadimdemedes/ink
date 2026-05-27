import {useContext, useInsertionEffect} from 'react';
import CursorContext from '../components/CursorContext.js';
import {type CursorPosition, type CursorShape} from '../log-update.js';

type Options = {
	/**
	Cursor position relative to the Ink output origin. The cursor is shown at this position after every render. Omit (or pass `undefined`) to hide the cursor.
	*/
	readonly position?: CursorPosition;

	/**
	Cursor shape (DECSCUSR). Supported values are `block`, `bar`, `underline`, and their `blinking-` variants. Pass `'default'` to actively restore the terminal's user-configured shape, or omit (or pass `undefined`) to leave the current shape unchanged.
	*/
	readonly shape?: CursorShape;
};

/**
A React hook that declaratively controls the terminal cursor.

Pass `position` to show the cursor at the given coordinates (relative to the Ink output origin), useful for IME (Input Method Editor) support, where the composing character is displayed at the cursor location. Pass `undefined` to hide the cursor.

Pass `shape` to set the cursor shape via DECSCUSR (`CSI Ps SP q`). Both fields are optional, and when the component unmounts the cursor state is released so the terminal returns to its previous appearance.
*/
const useCursor = (options?: Options): void => {
	const context = useContext(CursorContext);

	// Propagate cursor position and shape to log-update only during commit phase.
	// useInsertionEffect runs before resetAfterCommit (which triggers onRender),
	// and does NOT run for abandoned concurrent renders (e.g. suspended components).
	// This prevents cursor state from leaking across render boundaries.
	useInsertionEffect(() => {
		context.setCursorPosition(options?.position);
		context.setCursorShape(options?.shape);
		return () => {
			context.setCursorPosition(undefined);
			context.setCursorShape(undefined);
		};
	});
};

export default useCursor;
