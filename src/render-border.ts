import cliBoxes from 'cli-boxes';
import colorize from './colorize.js';
import {type DOMNode} from './dom.js';
import type Output from './output.js';

const renderBorder = (
	x: number,
	y: number,
	node: DOMNode,
	output: Output
): void => {
	if (typeof node.style.borderStyle === 'string') {
		const width = node.yogaNode!.getComputedWidth();
		const height = node.yogaNode!.getComputedHeight();
		const color = node.style.borderColor;
		const box = cliBoxes[node.style.borderStyle];

		const topBorder = colorize(
			box.topLeft + box.top.repeat(width - 2) + box.topRight,
			color,
			'foreground'
		);

		const verticalBorder = (
			colorize(box.left, color, 'foreground') + '\n'
		).repeat(height - 2);

		const bottomBorder = colorize(
			box.bottomLeft + box.bottom.repeat(width - 2) + box.bottomRight,
			color,
			'foreground'
		);

		output.write(x, y, topBorder, {transformers: []});
		output.write(x, y + 1, verticalBorder, {transformers: []});
		output.write(x + width - 1, y + 1, verticalBorder, {transformers: []});
		output.write(x, y + height - 1, bottomBorder, {transformers: []});
	}
};

export default renderBorder;
