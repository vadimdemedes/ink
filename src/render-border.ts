import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import type {DOMNode} from './dom';
import type Output from './output';

export default (x: number, y: number, node: DOMNode, output: Output): void => {
	if (typeof node.style.borderStyle === 'string') {
		const width = node.yogaNode!.getComputedWidth();
		const height = node.yogaNode!.getComputedHeight();
		const color = node.style.borderColor;
		const box = cliBoxes[node.style.borderStyle];

		const colorize = (str: string): string => {
			return color ? chalk[color](str) : str;
		};

		const topBorder = colorize(
			box.topLeft + box.horizontal.repeat(width - 2) + box.topRight
		);

		const verticalBorder = (colorize(box.vertical) + '\n').repeat(height - 2);

		const bottomBorder = colorize(
			box.bottomLeft + box.horizontal.repeat(width - 2) + box.bottomRight
		);

		output.write(x, y, topBorder, {transformers: []});
		output.write(x, y + 1, verticalBorder, {transformers: []});
		output.write(x + width - 1, y + 1, verticalBorder, {transformers: []});
		output.write(x, y + height - 1, bottomBorder, {transformers: []});
	}
};
