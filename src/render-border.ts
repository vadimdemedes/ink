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
		const box = cliBoxes[node.style.borderStyle];

		const topBorderColor = node.style.borderTopColor ?? node.style.borderColor;
		const bottomBorderColor =
			node.style.borderBottomColor ?? node.style.borderColor;
		const leftBorderColor =
			node.style.borderLeftColor ?? node.style.borderColor;
		const rightBorderColor =
			node.style.borderRightColor ?? node.style.borderColor;

		const showTopBorder = node.style.borderTop !== false;
		const showBottomBorder = node.style.borderBottom !== false;
		const showLeftBorder = node.style.borderLeft !== false;
		const showRightBorder = node.style.borderRight !== false;

		const contentWidth =
			width - (showLeftBorder ? 1 : 0) - (showRightBorder ? 1 : 0);

		const topBorder = showTopBorder
			? colorize(
					(showLeftBorder ? box.topLeft : '') +
						box.top.repeat(contentWidth) +
						(showRightBorder ? box.topRight : ''),
					topBorderColor,
					'foreground'
			  )
			: undefined;

		let verticalBorderHeight = height;

		if (showTopBorder) {
			verticalBorderHeight -= 1;
		}

		if (showBottomBorder) {
			verticalBorderHeight -= 1;
		}

		const leftBorder = (
			colorize(box.left, leftBorderColor, 'foreground') + '\n'
		).repeat(verticalBorderHeight);

		const rightBorder = (
			colorize(box.right, rightBorderColor, 'foreground') + '\n'
		).repeat(verticalBorderHeight);

		const bottomBorder = showBottomBorder
			? colorize(
					(showLeftBorder ? box.bottomLeft : '') +
						box.bottom.repeat(contentWidth) +
						(showRightBorder ? box.bottomRight : ''),
					bottomBorderColor,
					'foreground'
			  )
			: undefined;

		const offsetY = showTopBorder ? 1 : 0;

		if (topBorder) {
			output.write(x, y, topBorder, {transformers: []});
		}

		if (showLeftBorder) {
			output.write(x, y + offsetY, leftBorder, {transformers: []});
		}

		if (showRightBorder) {
			output.write(x + width - 1, y + offsetY, rightBorder, {
				transformers: []
			});
		}

		if (bottomBorder) {
			output.write(x, y + height - 1, bottomBorder, {transformers: []});
		}
	}
};

export default renderBorder;
