import React from 'react';

/**
 * Alternative to useCursor hook that may be placed inline amongst
 * `<Text>` elements to determine cursor position implicitly based
 * on text wrapping, etc.
 */
export default function Cursor() {
	return <ink-text internal_cursorOffset={0} />;
}
