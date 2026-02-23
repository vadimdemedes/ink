/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import {type Boxes, type BoxStyle} from 'cli-boxes';
import {type LiteralUnion} from 'type-fest';
import {type ForegroundColorName} from 'ansi-styles'; // Note: We import directly from `ansi-styles` to avoid a bug in TypeScript.
import Yoga, {type Node as YogaNode} from 'yoga-layout';

export type Styles = {
	readonly textWrap?:
		| 'wrap'
		| 'end'
		| 'middle'
		| 'truncate-end'
		| 'truncate'
		| 'truncate-middle'
		| 'truncate-start';

	/**
	Controls how the element is positioned.

	When `position` is `static`, `top`, `right`, `bottom`, and `left` are ignored.
	*/
	readonly position?: 'absolute' | 'relative' | 'static';

	/**
	Top offset for positioned elements.
	*/
	readonly top?: number | string;

	/**
	Right offset for positioned elements.
	*/
	readonly right?: number | string;

	/**
	Bottom offset for positioned elements.
	*/
	readonly bottom?: number | string;

	/**
	Left offset for positioned elements.
	*/
	readonly left?: number | string;

	/**
	Size of the gap between an element's columns.
	*/
	readonly columnGap?: number;

	/**
	Size of the gap between an element's rows.
	*/
	readonly rowGap?: number;

	/**
	Size of the gap between an element's columns and rows. A shorthand for `columnGap` and `rowGap`.
	*/
	readonly gap?: number;

	/**
	Margin on all sides. Equivalent to setting `marginTop`, `marginBottom`, `marginLeft`, and `marginRight`.
	*/
	readonly margin?: number;

	/**
	Horizontal margin. Equivalent to setting `marginLeft` and `marginRight`.
	*/
	readonly marginX?: number;

	/**
	Vertical margin. Equivalent to setting `marginTop` and `marginBottom`.
	*/
	readonly marginY?: number;

	/**
	Top margin.
	*/
	readonly marginTop?: number;

	/**
	Bottom margin.
	*/
	readonly marginBottom?: number;

	/**
	Left margin.
	*/
	readonly marginLeft?: number;

	/**
	Right margin.
	*/
	readonly marginRight?: number;

	/**
	Padding on all sides. Equivalent to setting `paddingTop`, `paddingBottom`, `paddingLeft`, and `paddingRight`.
	*/
	readonly padding?: number;

	/**
	Horizontal padding. Equivalent to setting `paddingLeft` and `paddingRight`.
	*/
	readonly paddingX?: number;

	/**
	Vertical padding. Equivalent to setting `paddingTop` and `paddingBottom`.
	*/
	readonly paddingY?: number;

	/**
	Top padding.
	*/
	readonly paddingTop?: number;

	/**
	Bottom padding.
	*/
	readonly paddingBottom?: number;

	/**
	Left padding.
	*/
	readonly paddingLeft?: number;

	/**
	Right padding.
	*/
	readonly paddingRight?: number;

	/**
	This property defines the ability for a flex item to grow if necessary.
	See [flex-grow](https://css-tricks.com/almanac/properties/f/flex-grow/).
	*/
	readonly flexGrow?: number;

	/**
	It specifies the “flex shrink factor”, which determines how much the flex item will shrink relative to the rest of the flex items in the flex container when there isn’t enough space on the row.
	See [flex-shrink](https://css-tricks.com/almanac/properties/f/flex-shrink/).
	*/
	readonly flexShrink?: number;

	/**
	It establishes the main-axis, thus defining the direction flex items are placed in the flex container.
	See [flex-direction](https://css-tricks.com/almanac/properties/f/flex-direction/).
	*/
	readonly flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

	/**
	It specifies the initial size of the flex item, before any available space is distributed according to the flex factors.
	See [flex-basis](https://css-tricks.com/almanac/properties/f/flex-basis/).
	*/
	readonly flexBasis?: number | string;

	/**
	It defines whether the flex items are forced in a single line or can be flowed into multiple lines. If set to multiple lines, it also defines the cross-axis which determines the direction new lines are stacked in.
	See [flex-wrap](https://css-tricks.com/almanac/properties/f/flex-wrap/).
	*/
	readonly flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

	/**
	The align-items property defines the default behavior for how items are laid out along the cross axis (perpendicular to the main axis).
	See [align-items](https://css-tricks.com/almanac/properties/a/align-items/).
	*/
	readonly alignItems?:
		| 'flex-start'
		| 'center'
		| 'flex-end'
		| 'stretch'
		| 'baseline';

	/**
	It makes possible to override the align-items value for specific flex items.
	See [align-self](https://css-tricks.com/almanac/properties/a/align-self/).
	*/
	readonly alignSelf?:
		| 'flex-start'
		| 'center'
		| 'flex-end'
		| 'auto'
		| 'stretch'
		| 'baseline';

	/**
	It defines the alignment along the cross axis when there are multiple lines of flex items (when using flex-wrap).
	See [align-content](https://css-tricks.com/almanac/properties/a/align-content/).
	*/
	readonly alignContent?:
		| 'flex-start'
		| 'flex-end'
		| 'center'
		| 'stretch'
		| 'space-between'
		| 'space-around'
		| 'space-evenly';

	/**
	It defines the alignment along the main axis.
	See [justify-content](https://css-tricks.com/almanac/properties/j/justify-content/).
	*/
	readonly justifyContent?:
		| 'flex-start'
		| 'flex-end'
		| 'space-between'
		| 'space-around'
		| 'space-evenly'
		| 'center';

	/**
	Width of the element in spaces. You can also set it as a percentage, which will calculate the width based on the width of the parent element.
	*/
	readonly width?: number | string;

	/**
	Height of the element in lines (rows). You can also set it as a percentage, which will calculate the height based on the height of the parent element.
	*/
	readonly height?: number | string;

	/**
	Sets a minimum width of the element.
	Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.
	*/
	readonly minWidth?: number | string;

	/**
	Sets a minimum height of the element in lines (rows). You can also set it as a percentage, which will calculate the minimum height based on the height of the parent element.
	*/
	readonly minHeight?: number | string;

	/**
	Sets a maximum width of the element.
	Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.
	*/
	readonly maxWidth?: number | string;

	/**
	Sets a maximum height of the element in lines (rows). You can also set it as a percentage, which will calculate the maximum height based on the height of the parent element.
	*/
	readonly maxHeight?: number | string;

	/**
	Defines the aspect ratio (width/height) for the element.

	Use it with at least one size constraint (`width`, `height`, `minHeight`, or `maxHeight`) so Ink can derive the missing dimension.
	*/
	readonly aspectRatio?: number;

	/**
	Set this property to `none` to hide the element.
	*/
	readonly display?: 'flex' | 'none';

	/**
	Add a border with a specified style. If `borderStyle` is `undefined` (the default), no border will be added.
	*/
	readonly borderStyle?: keyof Boxes | BoxStyle;

	/**
	Determines whether the top border is visible.

	@default true
	*/
	readonly borderTop?: boolean;

	/**
	Determines whether the bottom border is visible.

	@default true
	*/
	readonly borderBottom?: boolean;

	/**
	Determines whether the left border is visible.

	@default true
	*/
	readonly borderLeft?: boolean;

	/**
	Determines whether the right border is visible.

	@default true
	*/
	readonly borderRight?: boolean;

	/**
	Change border color. A shorthand for setting `borderTopColor`, `borderRightColor`, `borderBottomColor`, and `borderLeftColor`.
	*/
	readonly borderColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change the top border color. Accepts the same values as `color` in `Text` component.
	*/
	readonly borderTopColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change the bottom border color. Accepts the same values as `color` in `Text` component.
	*/
	readonly borderBottomColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change the left border color. Accepts the same values as `color` in `Text` component.
	*/
	readonly borderLeftColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change the right border color. Accepts the same values as `color` in `Text` component.
	*/
	readonly borderRightColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Dim the border color. A shorthand for setting `borderTopDimColor`, `borderBottomDimColor`, `borderLeftDimColor`, and `borderRightDimColor`.

	@default false
	*/
	readonly borderDimColor?: boolean;

	/**
	Dim the top border color.

	@default false
	*/
	readonly borderTopDimColor?: boolean;

	/**
	Dim the bottom border color.

	@default false
	*/
	readonly borderBottomDimColor?: boolean;

	/**
	Dim the left border color.

	@default false
	*/
	readonly borderLeftDimColor?: boolean;

	/**
	Dim the right border color.

	@default false
	*/
	readonly borderRightDimColor?: boolean;

	/**
	Behavior for an element's overflow in both directions.

	@default 'visible'
	*/
	readonly overflow?: 'visible' | 'hidden';

	/**
	Behavior for an element's overflow in the horizontal direction.

	@default 'visible'
	*/
	readonly overflowX?: 'visible' | 'hidden';

	/**
	Behavior for an element's overflow in the vertical direction.

	@default 'visible'
	*/
	readonly overflowY?: 'visible' | 'hidden';

	/**
	Background color for the element.

	Accepts the same values as `color` in the `<Text>` component.
	*/
	readonly backgroundColor?: LiteralUnion<ForegroundColorName, string>;
};

const positionEdges = [
	['top', Yoga.EDGE_TOP],
	['right', Yoga.EDGE_RIGHT],
	['bottom', Yoga.EDGE_BOTTOM],
	['left', Yoga.EDGE_LEFT],
] as const;

const applyPositionStyles = (node: YogaNode, style: Styles): void => {
	if ('position' in style) {
		let positionType = Yoga.POSITION_TYPE_RELATIVE;

		if (style.position === 'absolute') {
			positionType = Yoga.POSITION_TYPE_ABSOLUTE;
		} else if (style.position === 'static') {
			positionType = Yoga.POSITION_TYPE_STATIC;
		}

		node.setPositionType(positionType);
	}

	for (const [property, edge] of positionEdges) {
		if (!(property in style)) {
			continue;
		}

		const value = style[property];

		if (typeof value === 'string') {
			node.setPositionPercent(edge, Number.parseFloat(value));
			continue;
		}

		node.setPosition(edge, value);
	}
};

const applyMarginStyles = (node: YogaNode, style: Styles): void => {
	if ('margin' in style) {
		node.setMargin(Yoga.EDGE_ALL, style.margin ?? 0);
	}

	if ('marginX' in style) {
		node.setMargin(Yoga.EDGE_HORIZONTAL, style.marginX ?? 0);
	}

	if ('marginY' in style) {
		node.setMargin(Yoga.EDGE_VERTICAL, style.marginY ?? 0);
	}

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

const applyPaddingStyles = (node: YogaNode, style: Styles): void => {
	if ('padding' in style) {
		node.setPadding(Yoga.EDGE_ALL, style.padding ?? 0);
	}

	if ('paddingX' in style) {
		node.setPadding(Yoga.EDGE_HORIZONTAL, style.paddingX ?? 0);
	}

	if ('paddingY' in style) {
		node.setPadding(Yoga.EDGE_VERTICAL, style.paddingY ?? 0);
	}

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
			typeof style.flexShrink === 'number' ? style.flexShrink : 1,
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
			node.setFlexBasis(Number.NaN);
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

		if (style.alignItems === 'baseline') {
			node.setAlignItems(Yoga.ALIGN_BASELINE);
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

		if (style.alignSelf === 'stretch') {
			node.setAlignSelf(Yoga.ALIGN_STRETCH);
		}

		if (style.alignSelf === 'baseline') {
			node.setAlignSelf(Yoga.ALIGN_BASELINE);
		}
	}

	if ('alignContent' in style) {
		// Keep wrapped lines top-packed by default; stretch can add surprising empty rows in fixed-height boxes.
		if (style.alignContent === 'flex-start' || !style.alignContent) {
			node.setAlignContent(Yoga.ALIGN_FLEX_START);
		}

		if (style.alignContent === 'center') {
			node.setAlignContent(Yoga.ALIGN_CENTER);
		}

		if (style.alignContent === 'flex-end') {
			node.setAlignContent(Yoga.ALIGN_FLEX_END);
		}

		if (style.alignContent === 'space-between') {
			node.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
		}

		if (style.alignContent === 'space-around') {
			node.setAlignContent(Yoga.ALIGN_SPACE_AROUND);
		}

		if (style.alignContent === 'space-evenly') {
			node.setAlignContent(Yoga.ALIGN_SPACE_EVENLY);
		}

		if (style.alignContent === 'stretch') {
			node.setAlignContent(Yoga.ALIGN_STRETCH);
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

		if (style.justifyContent === 'space-evenly') {
			node.setJustifyContent(Yoga.JUSTIFY_SPACE_EVENLY);
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

	if ('maxWidth' in style) {
		if (typeof style.maxWidth === 'string') {
			node.setMaxWidthPercent(Number.parseInt(style.maxWidth, 10));
		} else {
			node.setMaxWidth(style.maxWidth);
		}
	}

	if ('maxHeight' in style) {
		if (typeof style.maxHeight === 'string') {
			node.setMaxHeightPercent(Number.parseInt(style.maxHeight, 10));
		} else {
			node.setMaxHeight(style.maxHeight);
		}
	}

	if ('aspectRatio' in style) {
		node.setAspectRatio(style.aspectRatio);
	}
};

const applyDisplayStyles = (node: YogaNode, style: Styles): void => {
	if ('display' in style) {
		node.setDisplay(
			style.display === 'flex' ? Yoga.DISPLAY_FLEX : Yoga.DISPLAY_NONE,
		);
	}
};

const applyBorderStyles = (
	node: YogaNode,
	style: Styles,
	currentStyle: Styles,
): void => {
	const hasBorderChanges =
		'borderStyle' in style ||
		'borderTop' in style ||
		'borderBottom' in style ||
		'borderLeft' in style ||
		'borderRight' in style;

	if (!hasBorderChanges) {
		return;
	}

	const borderWidth = currentStyle.borderStyle ? 1 : 0;

	node.setBorder(
		Yoga.EDGE_TOP,
		currentStyle.borderTop === false ? 0 : borderWidth,
	);
	node.setBorder(
		Yoga.EDGE_BOTTOM,
		currentStyle.borderBottom === false ? 0 : borderWidth,
	);
	node.setBorder(
		Yoga.EDGE_LEFT,
		currentStyle.borderLeft === false ? 0 : borderWidth,
	);
	node.setBorder(
		Yoga.EDGE_RIGHT,
		currentStyle.borderRight === false ? 0 : borderWidth,
	);
};

const applyGapStyles = (node: YogaNode, style: Styles): void => {
	if ('gap' in style) {
		node.setGap(Yoga.GUTTER_ALL, style.gap ?? 0);
	}

	if ('columnGap' in style) {
		node.setGap(Yoga.GUTTER_COLUMN, style.columnGap ?? 0);
	}

	if ('rowGap' in style) {
		node.setGap(Yoga.GUTTER_ROW, style.rowGap ?? 0);
	}
};

const styles = (
	node: YogaNode,
	style: Styles = {},
	currentStyle: Styles = style,
): void => {
	applyPositionStyles(node, style);
	applyMarginStyles(node, style);
	applyPaddingStyles(node, style);
	applyFlexStyles(node, style);
	applyDimensionStyles(node, style);
	applyDisplayStyles(node, style);
	applyBorderStyles(node, style, currentStyle);
	applyGapStyles(node, style);
};

export default styles;
