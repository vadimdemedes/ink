import cliBoxes from 'cli-boxes';
import colorize from './colorize';
import {DOMNode} from './dom';
import Output from './output';

export default (x: number, y: number, node: DOMNode, output: Output): void => {
	if (typeof node.style.borderStyle === 'string') {
		const width = node.yogaNode!.getComputedWidth();
		const height = node.yogaNode!.getComputedHeight();
		const color = node.style.borderColor;
		const box = cliBoxes[node.style.borderStyle];

		const {borderTop, borderBottom, borderRight, borderLeft} = node.style;

		const borderHorizontalAmount = Number(borderLeft) + Number(borderRight);
		const borderVerticalAmount = Number(borderTop) + Number(borderBottom);

		const maybeTopLeft = borderTop && borderLeft ? box.topLeft : '';
		const maybeTopRight = borderTop && borderRight ? box.topRight : '';
		const maybeBottomLeft = borderBottom && borderLeft ? box.bottomLeft : '';
		const maybeBottomRight = borderBottom && borderRight ? box.bottomRight : '';

		const topBorder = colorize(
			maybeTopLeft +
				box.horizontal.repeat(width - borderHorizontalAmount) +
				maybeTopRight,
			color,
			'foreground'
		);

		const verticalBorder = (
			colorize(box.vertical, color, 'foreground') + '\n'
		).repeat(height - borderVerticalAmount);

		const bottomBorder = colorize(
			maybeBottomLeft +
				box.horizontal.repeat(width - borderHorizontalAmount) +
				maybeBottomRight,
			color,
			'foreground'
		);


		const offsetY = borderTop ? 0 : -1;
		if (borderTop) output.write(x, y, topBorder, {transformers: []});
		if (borderLeft)
			output.write(x, y + 1 + offsetY, verticalBorder, {transformers: []});
		if (borderRight)
			output.write(x + width - 1, y + 1 + offsetY, verticalBorder, {
				transformers: []
			});
		if (borderBottom)
			output.write(x, y + height - 1, bottomBorder, {
				transformers: []
			});
	}
};
