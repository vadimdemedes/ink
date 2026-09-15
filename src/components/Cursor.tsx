import React from 'react';
import {
	buildRenderCursorHereSequence,
	type CursorShape,
	isValidCursorShape,
} from '../cursor-helpers.js';

export type Props = {
	readonly shape?: CursorShape;
};

/**
 * Alternative to useCursor hook that may be placed inline amongst
 * `<Text>` elements to determine cursor position implicitly based
 * on text wrapping, etc.
 */
export default function Cursor({shape = 'block'}: Props) {
	if (!isValidCursorShape(shape)) {
		throw new Error('Invalid cursor shape');
	}

	const marker = buildRenderCursorHereSequence(shape);
	return <ink-text>{marker}</ink-text>;
}
