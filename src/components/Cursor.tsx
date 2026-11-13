import React, {useInsertionEffect} from 'react';
import {useCursorContext} from './CursorContext.js';

/**
 Alternative to useCursor hook that may be placed inline amongst
 `<Text>` elements to determine cursor position implicitly based
 on text wrapping, etc.
 */
export default function Cursor() {
	const context = useCursorContext();

	// Register the usage of this element during the commit phase,
	// symmetrically to how useCursor registers position.
	useInsertionEffect(() => context.registerCursorElement());

	return <ink-text internal_cursorOffset={0} />;
}
