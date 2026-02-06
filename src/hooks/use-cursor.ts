import {useContext} from 'react';
import CursorContext from '../components/CursorContext.js';

/**
`useCursor` is a React hook that lets you control the terminal cursor position.

Setting a cursor position makes the cursor visible at the specified coordinates
(relative to the Ink output origin). This is useful for IME (Input Method Editor)
support, where the composing character is displayed at the cursor location.

Pass `undefined` to hide the cursor.
*/
const useCursor = () => useContext(CursorContext);
export default useCursor;
