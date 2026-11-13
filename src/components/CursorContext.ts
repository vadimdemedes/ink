import {createContext, use, useLayoutEffect} from 'react';
import {type CursorPosition} from '../log-update.js';

export type Props = {
	/**
	Set the cursor position relative to the Ink output.

	Pass `undefined` to hide the cursor.
	*/
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;

	/**
	Register a mounted `<Cursor />` element. Returns a function that unregisters it.
	*/
	readonly registerCursorElement: () => () => void;

	/**
	Throw if `useCursor` and `<Cursor />` are both trying to control the cursor.

	If you call `useCursorContext` then this will be managed for you.
	*/
	readonly assertSingleCursorMode: () => void;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const CursorContext = createContext<Props>({
	setCursorPosition() {},
	registerCursorElement: () => () => {},
	assertSingleCursorMode() {},
});

CursorContext.displayName = 'InternalCursorContext';

export function useCursorContext() {
	const context = use(CursorContext);

	// Clients of this context register their activity in an insertion effect
	// (commit phase) so we use a layout effect to verify a single cursor
	// mode to ensure it runs after all those have been applied, and to
	// prevent the risk of any one client forgetting to collaborate in this check
	useLayoutEffect(() => {
		context.assertSingleCursorMode();
	});

	return context;
}

export default CursorContext;
