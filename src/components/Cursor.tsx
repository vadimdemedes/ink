import React from 'react';
import {buildRenderCursorHereSequence} from '../cursor-helpers.js';

const shapeToCode = {
	blockBlink: 1,
	block: 2,
	underscoreBlink: 3,
	underscore: 4,
	pipeBlink: 5,
	pipe: 6,
};

export type Props = {
	readonly shape?: keyof typeof shapeToCode;
};

export default function Cursor({shape = 'block'}: Props) {
	const code = shapeToCode[shape];
	if (code === undefined) {
		throw new Error(`No such cursor shape ${shape}`);
	}

	const marker = buildRenderCursorHereSequence(code);
	return <ink-text>{marker}</ink-text>;
}
