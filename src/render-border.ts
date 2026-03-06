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

		const stylePiece = (
			segment: string,
			fg?: string,
			bg?: string,
			dim?: boolean,
		): string => {
			let styled = colorize(segment, fg, 'foreground');
			styled = colorize(styled, bg, 'background');
			if (dim) {
				styled = chalk.dim(styled);
			}

			return styled;
		};

		topBorder &&= stylePiece(
			topBorder,
			topBorderColor,
			topBorderBackgroundColor,
			dimTopBorderColor,
		);

		let verticalBorderHeight = height;

		if (showTopBorder) {
			verticalBorderHeight -= 1;
		}

		if (showBottomBorder) {
			verticalBorderHeight -= 1;
		}

		let leftBorder = '';

		if (showLeftBorder) {
			const one = stylePiece(
				box.left,
				leftBorderColor,
				leftBorderBackgroundColor,
				dimLeftBorderColor,
			);
			leftBorder = (one + '\n').repeat(verticalBorderHeight);
		}

		let rightBorder = '';

		if (showRightBorder) {
			const one = stylePiece(
				box.right,
				rightBorderColor,
				rightBorderBackgroundColor,
				dimRightBorderColor,
			);
			rightBorder = (one + '\n').repeat(verticalBorderHeight);
		}

		let bottomBorder = showBottomBorder
			? (showLeftBorder ? box.bottomLeft : '') +
				box.bottom.repeat(contentWidth) +
				(showRightBorder ? box.bottomRight : '')
			: undefined;
		bottomBorder &&= stylePiece(
			bottomBorder,
			bottomBorderColor,
			bottomBorderBackgroundColor,
			dimBottomBorderColor,
		);

		const offsetY = showTopBorder ? 1 : 0;

		if (topBorder) {
			output.write(x, y, topBorder, {transformers: []});
		}

		if (leftBorder) {
			output.write(x, y + offsetY, leftBorder, {transformers: []});
		}

		if (rightBorder) {
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
