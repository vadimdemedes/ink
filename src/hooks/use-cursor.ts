import {useContext, useRef, useCallback, useInsertionEffect} from 'react';
import CursorContext from '../components/CursorContext.js';
import {type CursorPosition, type CursorShape} from '../log-update.js';

/**
A React hook that returns methods to control the terminal cursor shape and position.

`setCursorPosition` makes the cursor visible at the specified coordinates (relative to the Ink output origin). This is useful for IME (Input Method Editor) support, where the composing character is displayed at the cursor location. Pass `undefined` to hide the cursor.

`setCursorShape` sets the cursor shape via DECSCUSR (`CSI Ps SP q`). Supported shapes are `block`, `bar`, `underline`, and their `blinking-` variants. Pass `'default'` to actively restore the terminal's user-configured shape, or `undefined` to leave the shape unchanged.
*/
const useCursor = () => {
	const context = useContext(CursorContext);
	const positionRef = useRef<CursorPosition | undefined>(undefined);
	const shapeRef = useRef<CursorShape | undefined>(undefined);

	const setCursorPosition = useCallback(
		(position: CursorPosition | undefined) => {
			positionRef.current = position;
		},
		[],
	);

	const setCursorShape = useCallback((shape: CursorShape | undefined) => {
		shapeRef.current = shape;
	}, []);

	// Propagate cursor position and shape to log-update only during commit phase.
	// useInsertionEffect runs before resetAfterCommit (which triggers onRender),
	// and does NOT run for abandoned concurrent renders (e.g. suspended components).
	// This prevents cursor state from leaking across render boundaries.
	useInsertionEffect(() => {
		context.setCursorPosition(positionRef.current);
		context.setCursorShape(shapeRef.current);
		return () => {
			context.setCursorPosition(undefined);
			context.setCursorShape(undefined);
		};
	});

	return {setCursorPosition, setCursorShape};
};

export default useCursor;
