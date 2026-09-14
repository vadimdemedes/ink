import React from 'react';
import {buildRenderCursorHereSequence} from '../cursor-helpers.js';

const SHAPE_TO_CODE = {
	blockBlink: 1,
	block: 2,
	underscoreBlink: 3,
	underscore: 4,
	pipeBlink: 5,
	pipe: 6,
};

export type Props = {
	readonly shape?: keyof typeof SHAPE_TO_CODE;
};

export default function Cursor({shape = 'block'}: Props) {
	const code = SHAPE_TO_CODE[shape];
	if (code == null) {
		throw new Error(`No such cursor shape ${shape}`);
	}
	const marker = buildRenderCursorHereSequence(code);
	return <ink-text>{marker}</ink-text>;
}
