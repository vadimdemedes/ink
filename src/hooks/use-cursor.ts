import {useContext} from 'react';
import CursorContext, {
	type CursorPosition,
} from '../components/CursorContext.js';

export type {CursorPosition};

/**
 * `useCursor` is a React hook that allows components to control the cursor position
 * after rendering. This is essential for proper IME (Input Method Editor) support,
 * as the IME candidate window typically appears at the cursor position.
 *
 * @example
 * ```tsx
 * import {useCursor} from 'ink';
 *
 * function MyInput() {
 *   const {setCursorPosition} = useCursor();
 *
 *   useEffect(() => {
 *     // Position cursor 2 lines from bottom, at column 10
 *     setCursorPosition({x: 10, y: 2});
 *
 *     return () => {
 *       // Clear cursor position on unmount
 *       setCursorPosition(undefined);
 *     };
 *   }, [setCursorPosition]);
 *
 *   return <Text>Input field here</Text>;
 * }
 * ```
 */
const useCursor = () => useContext(CursorContext);

export default useCursor;
