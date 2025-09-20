import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import colorize from './colorize.js';
import {type DOMNode} from './dom.js';
import type Output from './output.js';

const renderBorder = (
	x: number,
	y: number,
	node: DOMNode,
	output: Output,
): void => {
	if (node.style.borderStyle) {
		const width = node.yogaNode!.getComputedWidth();
		const height = node.yogaNode!.getComputedHeight();
		const box =
			typeof node.style.borderStyle === 'string'
				? cliBoxes[node.style.borderStyle]
				: node.style.borderStyle;

		const topBorderColor = node.style.borderTopColor ?? node.style.borderColor;
		const bottomBorderColor =
			node.style.borderBottomColor ?? node.style.borderColor;
		const leftBorderColor =
			node.style.borderLeftColor ?? node.style.borderColor;
		const rightBorderColor =
			node.style.borderRightColor ?? node.style.borderColor;

		const topBorderBackgroundColor =
			node.style.borderTopBackgroundColor ?? node.style.borderBackgroundColor;
		const bottomBorderBackgroundColor =
			node.style.borderBottomBackgroundColor ??
			node.style.borderBackgroundColor;
		const leftBorderBackgroundColor =
			node.style.borderLeftBackgroundColor ?? node.style.borderBackgroundColor;
		const rightBorderBackgroundColor =
			node.style.borderRightBackgroundColor ?? node.style.borderBackgroundColor;

		const dimTopBorderColor =
			node.style.borderTopDimColor ?? node.style.borderDimColor;

		const dimBottomBorderColor =
			node.style.borderBottomDimColor ?? node.style.borderDimColor;

		const dimLeftBorderColor =
			node.style.borderLeftDimColor ?? node.style.borderDimColor;

		const dimRightBorderColor =
			node.style.borderRightDimColor ?? node.style.borderDimColor;

		const dimTopBackground =
			node.style.borderTopBackgroundDimColor ??
			node.style.borderBackgroundDimColor;
		const dimBottomBackground =
			node.style.borderBottomBackgroundDimColor ??
			node.style.borderBackgroundDimColor;
		const dimLeftBackground =
			node.style.borderLeftBackgroundDimColor ??
			node.style.borderBackgroundDimColor;
		const dimRightBackground =
			node.style.borderRightBackgroundDimColor ??
			node.style.borderBackgroundDimColor;

		const showTopBorder = node.style.borderTop !== false;
		const showBottomBorder = node.style.borderBottom !== false;
		const showLeftBorder = node.style.borderLeft !== false;
		const showRightBorder = node.style.borderRight !== false;

		const contentWidth =
			width - (showLeftBorder ? 1 : 0) - (showRightBorder ? 1 : 0);

		let topBorder = showTopBorder
			? (showLeftBorder ? box.topLeft : '') +
				box.top.repeat(contentWidth) +
				(showRightBorder ? box.topRight : '')
			: undefined;

		if (showTopBorder && topBorder) {
			// Apply foreground color
			topBorder = colorize(topBorder, topBorderColor, 'foreground');
			// Apply background color
			topBorder = colorize(topBorder, topBorderBackgroundColor, 'background');
			// Apply dim if needed
			const shouldDimTop = [dimTopBorderColor, dimTopBackground].some(Boolean);
			if (shouldDimTop) {
				topBorder = chalk.dim(topBorder);
			}
		}

		let verticalBorderHeight = height;

		if (showTopBorder) {
			verticalBorderHeight -= 1;
		}

		if (showBottomBorder) {
			verticalBorderHeight -= 1;
		}

		let leftBorder = showLeftBorder
			? (box.left + '\n').repeat(verticalBorderHeight)
			: '';

		if (showLeftBorder && leftBorder) {
			// Apply foreground color
			leftBorder = colorize(leftBorder, leftBorderColor, 'foreground');
			// Apply background color
			leftBorder = colorize(
				leftBorder,
				leftBorderBackgroundColor,
				'background',
			);
			// Apply dim if needed
			const shouldDimLeft = [dimLeftBorderColor, dimLeftBackground].some(
				Boolean,
			);
			if (shouldDimLeft) {
				leftBorder = chalk.dim(leftBorder);
			}
		}

		let rightBorder = showRightBorder
			? (box.right + '\n').repeat(verticalBorderHeight)
			: '';

		if (showRightBorder && rightBorder) {
			// Apply foreground color
			rightBorder = colorize(rightBorder, rightBorderColor, 'foreground');
			// Apply background color
			rightBorder = colorize(
				rightBorder,
				rightBorderBackgroundColor,
				'background',
			);
			// Apply dim if needed
			const shouldDimRight = [dimRightBorderColor, dimRightBackground].some(
				Boolean,
			);
			if (shouldDimRight) {
				rightBorder = chalk.dim(rightBorder);
			}
		}

		let bottomBorder = showBottomBorder
			? (showLeftBorder ? box.bottomLeft : '') +
				box.bottom.repeat(contentWidth) +
				(showRightBorder ? box.bottomRight : '')
			: undefined;

		if (showBottomBorder && bottomBorder) {
			// Apply foreground color
			bottomBorder = colorize(bottomBorder, bottomBorderColor, 'foreground');
			// Apply background color
			bottomBorder = colorize(
				bottomBorder,
				bottomBorderBackgroundColor,
				'background',
			);
			// Apply dim if needed
			const shouldDimBottom = [dimBottomBorderColor, dimBottomBackground].some(
				Boolean,
			);
			if (shouldDimBottom) {
				bottomBorder = chalk.dim(bottomBorder);
			}
		}

		const offsetY = showTopBorder ? 1 : 0;

		if (topBorder) {
			output.write(x, y, topBorder, {transformers: []});
		}

		if (showLeftBorder) {
			output.write(x, y + offsetY, leftBorder, {transformers: []});
		}

		if (showRightBorder) {
			output.write(x + width - 1, y + offsetY, rightBorder, {
				transformers: [],
			});
		}

		if (bottomBorder) {
			output.write(x, y + height - 1, bottomBorder, {transformers: []});
		}
	}
};

export default renderBorder;
