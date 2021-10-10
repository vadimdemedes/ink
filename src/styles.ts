/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import Yoga, {YogaNode} from 'yoga-layout-prebuilt';
import {Boxes} from 'cli-boxes';
import {LiteralUnion} from 'type-fest';
import {ForegroundColor} from 'chalk';

export interface Styles {
	readonly textWrap?:
		| 'wrap'
		| 'end'
		| 'middle'
		| 'truncate-end'
		| 'truncate'
		| 'truncate-middle'
		| 'truncate-start';

	readonly position?: 'absolute' | 'relative';

	/**
	 * Top margin.
	 */
	readonly marginTop?: number;

	/**
	 * Bottom margin.
	 */
	readonly marginBottom?: number;

	/**
	 * Left margin.
	 */
	readonly marginLeft?: number;

	/**
	 * Right margin.
	 */
	readonly marginRight?: number;

	/**
	 * Top padding.
	 */
	readonly paddingTop?: number;

	/**
	 * Bottom padding.
	 */
	readonly paddingBottom?: number;

	/**
	 * Left padding.
	 */
	readonly paddingLeft?: number;

	/**
	 * Right padding.
	 */
	readonly paddingRight?: number;

	/**
	 * This property defines the ability for a flex item to grow if necessary.
	 * See [flex-grow](https://css-tricks.com/almanac/properties/f/flex-grow/).
	 */
	readonly flexGrow?: number;

	/**
	 * It specifies the “flex shrink factor”, which determines how much the flex item will shrink relative to the rest of the flex items in the flex container when there isn’t enough space on the row.
	 * See [flex-shrink](https://css-tricks.com/almanac/properties/f/flex-shrink/).
	 */
	readonly flexShrink?: number;

	/**
	 * It establishes the main-axis, thus defining the direction flex items are placed in the flex container.
	 * See [flex-direction](https://css-tricks.com/almanac/properties/f/flex-direction/).
	 */
	readonly flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

	/**
	 * It specifies the initial size of the flex item, before any available space is distributed according to the flex factors.
	 * See [flex-basis](https://css-tricks.com/almanac/properties/f/flex-basis/).
	 */
	readonly flexBasis?: number | string;

	/**
	 * It defines whether the flex items are forced in a single line or can be flowed into multiple lines. If set to multiple lines, it also defines the cross-axis which determines the direction new lines are stacked in.
	 * See [flex-wrap](https://css-tricks.com/almanac/properties/f/flex-wrap/).
	 */
	readonly flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

	/**
	 * The align-items property defines the default behavior for how items are laid out along the cross axis (perpendicular to the main axis).
	 * See [align-items](https://css-tricks.com/almanac/properties/a/align-items/).
	 */
	readonly alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';

	/**
	 * It makes possible to override the align-items value for specific flex items.
	 * See [align-self](https://css-tricks.com/almanac/properties/a/align-self/).
	 */
	readonly alignSelf?: 'flex-start' | 'center' | 'flex-end' | 'auto';

	/**
	 * It defines the alignment along the main axis.
	 * See [justify-content](https://css-tricks.com/almanac/properties/j/justify-content/).
	 */
	readonly justifyContent?:
		| 'flex-start'
		| 'flex-end'
		| 'space-between'
		| 'space-around'
		| 'center';

	/**
	 * Width of the element in spaces.
	 * You can also set it in percent, which will calculate the width based on the width of parent element.
	 */
	readonly width?: number | string;

	/**
	 * Height of the element in lines (rows).
	 * You can also set it in percent, which will calculate the height based on the height of parent element.
	 */
	readonly height?: number | string;

	/**
	 * Sets a minimum width of the element.
	 */
	readonly minWidth?: number | string;

	/**
	 * Sets a minimum height of the element.
	 */
	readonly minHeight?: number | string;

	/**
	 * Set this property to `none` to hide the element.
	 */
	readonly display?: 'flex' | 'none';

	/**
	 * Add a border with a specified style.
	 * If `borderStyle` is `undefined` (which it is by default), no border will be added.
	 */
	readonly borderStyle?: keyof Boxes;

	/**
	 * Change border color.
	 * Accepts the same values as `color` in <Text> component.
	 */
	readonly borderColor?: LiteralUnion<typeof ForegroundColor, string>;
}

const applyPositionStyles = (node: Yoga.YogaNode, style: Styles): void => {
	if ('position' in style) {
		node.setPositionType(
			style.position === 'absolute'
				? Yoga.POSITION_TYPE_ABSOLUTE
				: Yoga.POSITION_TYPE_RELATIVE
		);
	}
};

const applyMarginStyles = (node: Yoga.YogaNode, style: Styles): void => {
	if ('marginLeft' in style) {
		node.setMargin(Yoga.EDGE_START, style.marginLeft || 0);
	}

	if ('marginRight' in style) {
		node.setMargin(Yoga.EDGE_END, style.marginRight || 0);
	}

	if ('marginTop' in style) {
		node.setMargin(Yoga.EDGE_TOP, style.marginTop || 0);
	}

	if ('marginBottom' in style) {
		node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom || 0);
	}
};

const applyPaddingStyles = (node: Yoga.YogaNode, style: Styles): void => {
	if ('paddingLeft' in style) {
		node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft || 0);
	}

	if ('paddingRight' in style) {
		node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight || 0);
	}

	if ('paddingTop' in style) {
		node.setPadding(Yoga.EDGE_TOP, style.paddingTop || 0);
	}

	if ('paddingBottom' in style) {
		node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom || 0);
	}
};

const applyFlexStyles = (node: YogaNode, style: Styles): void => {
	if ('flexGrow' in style) {
		node.setFlexGrow(style.flexGrow ?? 0);
	}

	if ('flexShrink' in style) {
		node.setFlexShrink(
			typeof style.flexShrink === 'number' ? style.flexShrink : 1
		);
	}

	if ('flexWrap' in style) {
		if (style.flexWrap === 'nowrap') {
			node.setFlexWrap(Yoga.WRAP_NO_WRAP);
		}

		if (style.flexWrap === 'wrap') {
			node.setFlexWrap(Yoga.WRAP_WRAP);
		}

		if (style.flexWrap === 'wrap-reverse') {
			node.setFlexWrap(Yoga.WRAP_WRAP_REVERSE);
		}
	}

	if ('flexDirection' in style) {
		if (style.flexDirection === 'row') {
			node.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
		}

		if (style.flexDirection === 'row-reverse') {
			node.setFlexDirection(Yoga.FLEX_DIRECTION_ROW_REVERSE);
		}

		if (style.flexDirection === 'column') {
			node.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN);
		}

		if (style.flexDirection === 'column-reverse') {
			node.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN_REVERSE);
		}
	}

	if ('flexBasis' in style) {
		if (typeof style.flexBasis === 'number') {
			node.setFlexBasis(style.flexBasis);
		} else if (typeof style.flexBasis === 'string') {
			node.setFlexBasisPercent(Number.parseInt(style.flexBasis, 10));
		} else {
			// This should be replaced with node.setFlexBasisAuto() when new Yoga release is out
			node.setFlexBasis(NaN);
		}
	}

	if ('alignItems' in style) {
		if (style.alignItems === 'stretch' || !style.alignItems) {
			node.setAlignItems(Yoga.ALIGN_STRETCH);
		}

		if (style.alignItems === 'flex-start') {
			node.setAlignItems(Yoga.ALIGN_FLEX_START);
		}

		if (style.alignItems === 'center') {
			node.setAlignItems(Yoga.ALIGN_CENTER);
		}

		if (style.alignItems === 'flex-end') {
			node.setAlignItems(Yoga.ALIGN_FLEX_END);
		}
	}

	if ('alignSelf' in style) {
		if (style.alignSelf === 'auto' || !style.alignSelf) {
			node.setAlignSelf(Yoga.ALIGN_AUTO);
		}

		if (style.alignSelf === 'flex-start') {
			node.setAlignSelf(Yoga.ALIGN_FLEX_START);
		}

		if (style.alignSelf === 'center') {
			node.setAlignSelf(Yoga.ALIGN_CENTER);
		}

		if (style.alignSelf === 'flex-end') {
			node.setAlignSelf(Yoga.ALIGN_FLEX_END);
		}
	}

	if ('justifyContent' in style) {
		if (style.justifyContent === 'flex-start' || !style.justifyContent) {
			node.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
		}

		if (style.justifyContent === 'center') {
			node.setJustifyContent(Yoga.JUSTIFY_CENTER);
		}

		if (style.justifyContent === 'flex-end') {
			node.setJustifyContent(Yoga.JUSTIFY_FLEX_END);
		}

		if (style.justifyContent === 'space-between') {
			node.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
		}

		if (style.justifyContent === 'space-around') {
			node.setJustifyContent(Yoga.JUSTIFY_SPACE_AROUND);
		}
	}
};

const applyDimensionStyles = (node: YogaNode, style: Styles): void => {
	if ('width' in style) {
		if (typeof style.width === 'number') {
			node.setWidth(style.width);
		} else if (typeof style.width === 'string') {
			node.setWidthPercent(Number.parseInt(style.width, 10));
		} else {
			node.setWidthAuto();
		}
	}

	if ('height' in style) {
		if (typeof style.height === 'number') {
			node.setHeight(style.height);
		} else if (typeof style.height === 'string') {
			node.setHeightPercent(Number.parseInt(style.height, 10));
		} else {
			node.setHeightAuto();
		}
	}

	if ('minWidth' in style) {
		if (typeof style.minWidth === 'string') {
			node.setMinWidthPercent(Number.parseInt(style.minWidth, 10));
		} else {
			node.setMinWidth(style.minWidth ?? 0);
		}
	}

	if ('minHeight' in style) {
		if (typeof style.minHeight === 'string') {
			node.setMinHeightPercent(Number.parseInt(style.minHeight, 10));
		} else {
			node.setMinHeight(style.minHeight ?? 0);
		}
	}
};

const applyDisplayStyles = (node: YogaNode, style: Styles): void => {
	if ('display' in style) {
		node.setDisplay(
			style.display === 'flex' ? Yoga.DISPLAY_FLEX : Yoga.DISPLAY_NONE
		);
	}
};

const applyBorderStyles = (node: YogaNode, style: Styles): void => {
	if ('borderStyle' in style) {
		const borderWidth = typeof style.borderStyle === 'string' ? 1 : 0;

		node.setBorder(Yoga.EDGE_TOP, borderWidth);
		node.setBorder(Yoga.EDGE_BOTTOM, borderWidth);
		node.setBorder(Yoga.EDGE_LEFT, borderWidth);
		node.setBorder(Yoga.EDGE_RIGHT, borderWidth);
	}
};

export default (node: YogaNode, style: Styles = {}): void => {
	applyPositionStyles(node, style);
	applyMarginStyles(node, style);
	applyPaddingStyles(node, style);
	applyFlexStyles(node, style);
	applyDimensionStyles(node, style);
	applyDisplayStyles(node, style);
	applyBorderStyles(node, style);
};
