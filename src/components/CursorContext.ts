import {createContext} from 'react';
import {type CursorPosition, type CursorShape} from '../log-update.js';

export type Props = {
	/**
	Set the cursor position relative to the Ink output.

	Pass `undefined` to hide the cursor.
	*/
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;

	/**
	Set the cursor shape (DECSCUSR).

	Pass `'default'` to actively restore the terminal's user-configured shape.
	Pass `undefined` to leave the shape unchanged.
	*/
	readonly setCursorShape: (shape: CursorShape | undefined) => void;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const CursorContext = createContext<Props>({
	setCursorPosition() {},
	setCursorShape() {},
});

CursorContext.displayName = 'InternalCursorContext';

export default CursorContext;
