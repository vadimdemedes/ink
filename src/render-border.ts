import * as cliBoxes from './cli-boxes';
import colorize from './colorize';
import {DOMNode} from './dom';
import Output from './output';

export default (x: number, y: number, node: DOMNode, output: Output): void => {
	if (!node.style.borderStyle) return;

	const width = node.yogaNode!.getComputedWidth();
	const height = node.yogaNode!.getComputedHeight();
	const color = node.style.borderColor;
	const box =
		typeof node.style.borderStyle === 'string'
			? cliBoxes[node.style.borderStyle]
			: node.style.borderStyle;

	const {left, right, top, bottom, topLeft, topRight, bottomLeft, bottomRight} =
		box;

	let shouldDrawTopLeft = Boolean((top || left) && topLeft);
	let shouldDrawTopRight = Boolean((top || right) && topRight);
	let shouldDrawBottomLeft = Boolean((bottom || left) && bottomLeft);
	let shouldDrawBottomRight = Boolean((bottom || right) && bottomRight);

	let heightUsedByBorders = 0;

	const offsetY = top ? 0 : -1;
	if (top) {
		const cornersWidth = Number(shouldDrawTopLeft) + Number(shouldDrawTopRight);
		const border = colorize(
			(shouldDrawTopLeft ? topLeft! : '') +
				top.repeat(Math.max(width - cornersWidth, 0)) +
				(shouldDrawTopRight ? topRight! : ''),
			color,
			'foreground'
		).slice(0, width);

		output.write(x, y, border, {transformers: []});

		shouldDrawTopLeft = false;
		shouldDrawTopRight = false;
		heightUsedByBorders += 1;
	}

	if (bottom) {
		const cornersWidth =
			Number(shouldDrawBottomLeft) + Number(shouldDrawBottomRight);
		const border = colorize(
			(shouldDrawBottomLeft ? bottomLeft! : '') +
				bottom.repeat(Math.max(width - cornersWidth, 0)) +
				(shouldDrawBottomRight ? bottomRight! : ''),
			color,
			'foreground'
		).slice(0, width);

		output.write(x, y + height - 1, border, {
			transformers: []
		});

		shouldDrawBottomLeft = false;
		shouldDrawBottomRight = false;
		heightUsedByBorders += 1;
	}

	if (left) {
		const cornersHeight =
			Number(shouldDrawTopLeft) + Number(shouldDrawBottomLeft);
		const border =
			(shouldDrawTopLeft
				? colorize(topLeft!, color, 'foreground') + '\n'
				: '') +
			(colorize(left, color, 'foreground') + '\n').repeat(
				Math.max(0, height - cornersHeight - heightUsedByBorders)
			) +
			(shouldDrawBottomLeft
				? colorize(bottomLeft!, color, 'foreground') + '\n'
				: '');

		output.write(x, y + 1 + offsetY, border, {transformers: []});
	}

	if (right) {
		const cornersHeight =
			Number(shouldDrawTopRight) + Number(shouldDrawBottomRight);
		const border =
			(shouldDrawTopRight
				? colorize(topRight!, color, 'foreground') + '\n'
				: '') +
			(colorize(right, color, 'foreground') + '\n').repeat(
				Math.max(0, height - cornersHeight - heightUsedByBorders)
			) +
			(shouldDrawBottomRight
				? colorize(bottomRight!, color, 'foreground') + '\n'
				: '');

		output.write(x + width - 1, y + 1 + offsetY, border, {
			transformers: []
		});
	}
};
