import {createContext} from 'react';

export type CursorPosition = {
	/**
	 * Column position (0-based). If undefined, cursor column is not changed.
	 */
	readonly x?: number;

	/**
	 * Row position from the bottom of the output (0 = last line, 1 = second to last, etc.)
	 * If undefined, cursor row is not changed.
	 */
	readonly y?: number;

	/**
	 * Whether to show the cursor. When true, the cursor will be visible at the specified position.
	 * This is useful for IME support, as IME candidate windows typically appear at the cursor position.
	 * Defaults to false.
	 */
	readonly visible?: boolean;
};

export type Props = {
	/**
	 * Set the cursor position after rendering.
	 * This is useful for IME (Input Method Editor) support, as the IME candidate window
	 * typically appears at the cursor position.
	 *
	 * @param position - The cursor position. Use `y` to specify lines from bottom,
	 *                   and `x` to specify column position.
	 */
	readonly setCursorPosition: (position: CursorPosition | undefined) => void;

	/**
	 * Get the current cursor position setting.
	 */
	readonly cursorPosition: CursorPosition | undefined;
};

/**
 * `CursorContext` is a React context that allows components to control
 * the cursor position after rendering, which is essential for proper IME support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const CursorContext = createContext<Props>({
	setCursorPosition() {},
	cursorPosition: undefined,
});

CursorContext.displayName = 'InternalCursorContext';

export default CursorContext;
