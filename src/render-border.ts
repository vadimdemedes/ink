import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import colorize from './colorize.js';
import {type DOMNode} from './dom.js';
import type Output from './output.js';

const stylePiece = (
	segment: string,
	fg?: string,
	bg?: string,
	isDim?: boolean,
): string => {
	let styled = colorize(segment, fg, 'foreground');
	styled = colorize(styled, bg, 'background');
	if (isDim) {
		styled = chalk.dim(styled);
	}

	return styled;
};

const renderBorder = (
	x: number,
	y: number,
	node: DOMNode,
	output: Output,
): void => {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'round'`), and any falsy value means unset.
	if (!node.style.borderStyle) {
		return;
	}

	const width = node.yogaNode!.getComputedWidth();
	const height = node.yogaNode!.getComputedHeight();
	const box =
		typeof node.style.borderStyle === 'string'
			? cliBoxes[node.style.borderStyle]
			: node.style.borderStyle;

	const topBorderColor = node.style.borderTopColor ?? node.style.borderColor;
	const bottomBorderColor =
		node.style.borderBottomColor ?? node.style.borderColor;
	const leftBorderColor = node.style.borderLeftColor ?? node.style.borderColor;
	const rightBorderColor =
		node.style.borderRightColor ?? node.style.borderColor;

	const topBorderBackgroundColor =
		node.style.borderTopBackgroundColor ?? node.style.borderBackgroundColor;
	const bottomBorderBackgroundColor =
		node.style.borderBottomBackgroundColor ?? node.style.borderBackgroundColor;
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

	const shouldShowTopBorder = node.style.borderTop !== false;
	const shouldShowBottomBorder = node.style.borderBottom !== false;
	const shouldShowLeftBorder = node.style.borderLeft !== false;
	const shouldShowRightBorder = node.style.borderRight !== false;

	const contentWidth =
		width - (shouldShowLeftBorder ? 1 : 0) - (shouldShowRightBorder ? 1 : 0);

	let topBorder = shouldShowTopBorder
		? (shouldShowLeftBorder ? box.topLeft : '') +
			box.top.repeat(contentWidth) +
			(shouldShowRightBorder ? box.topRight : '')
		: undefined;

	topBorder &&= stylePiece(
		topBorder,
		topBorderColor,
		topBorderBackgroundColor,
		dimTopBorderColor,
	);

	let verticalBorderHeight = height;

	if (shouldShowTopBorder) {
		verticalBorderHeight -= 1;
	}

	if (shouldShowBottomBorder) {
		verticalBorderHeight -= 1;
	}

	let leftBorder = '';

	if (shouldShowLeftBorder) {
		const one = stylePiece(
			box.left,
			leftBorderColor,
			leftBorderBackgroundColor,
			dimLeftBorderColor,
		);
		leftBorder = (one + '\n').repeat(verticalBorderHeight);
	}

	let rightBorder = '';

	if (shouldShowRightBorder) {
		const one = stylePiece(
			box.right,
			rightBorderColor,
			rightBorderBackgroundColor,
			dimRightBorderColor,
		);
		rightBorder = (one + '\n').repeat(verticalBorderHeight);
	}

	let bottomBorder = shouldShowBottomBorder
		? (shouldShowLeftBorder ? box.bottomLeft : '') +
			box.bottom.repeat(contentWidth) +
			(shouldShowRightBorder ? box.bottomRight : '')
		: undefined;
	bottomBorder &&= stylePiece(
		bottomBorder,
		bottomBorderColor,
		bottomBorderBackgroundColor,
		dimBottomBorderColor,
	);

	const offsetY = shouldShowTopBorder ? 1 : 0;

	if (topBorder !== undefined && topBorder !== '') {
		output.write(x, y, topBorder, {transformers: []});
	}

	if (leftBorder !== '') {
		output.write(x, y + offsetY, leftBorder, {transformers: []});
	}

	if (rightBorder !== '') {
		output.write(x + width - 1, y + offsetY, rightBorder, {
			transformers: [],
		});
	}

	if (bottomBorder !== undefined && bottomBorder !== '') {
		output.write(x, y + height - 1, bottomBorder, {transformers: []});
	}
};

export default renderBorder;
