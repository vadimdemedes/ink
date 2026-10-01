import colorize from './colorize.js';
import {type DOMNode} from './dom.js';
import type Output from './output.js';

const renderBackground = (
	x: number,
	y: number,
	node: DOMNode,
	output: Output,
): void => {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'red'`), and any falsy value means unset.
	if (!node.style.backgroundColor) {
		return;
	}

	const width = node.yogaNode!.getComputedWidth();
	const height = node.yogaNode!.getComputedHeight();

	// Calculate the actual content area considering borders
	const hasBorder = Boolean(node.style.borderStyle);
	const leftBorderWidth = hasBorder && node.style.borderLeft !== false ? 1 : 0;
	const rightBorderWidth =
		hasBorder && node.style.borderRight !== false ? 1 : 0;
	const topBorderHeight = hasBorder && node.style.borderTop !== false ? 1 : 0;
	const bottomBorderHeight =
		hasBorder && node.style.borderBottom !== false ? 1 : 0;

	const contentWidth = width - leftBorderWidth - rightBorderWidth;
	const contentHeight = height - topBorderHeight - bottomBorderHeight;

	if (!(contentWidth > 0 && contentHeight > 0)) {
		return;
	}

	// Create background fill for each row
	const backgroundLine = colorize(
		' '.repeat(contentWidth),
		node.style.backgroundColor,
		'background',
	);

	for (let row = 0; row < contentHeight; row++) {
		output.write(
			x + leftBorderWidth,
			y + topBorderHeight + row,
			backgroundLine,
			{transformers: []},
		);
	}
};

export default renderBackground;
