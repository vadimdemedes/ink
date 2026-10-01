import {type Boxes, type BoxStyle} from 'cli-boxes';
import {type LiteralUnion} from 'type-fest';
import {type ForegroundColorName} from 'ansi-styles'; // Note: We import directly from `ansi-styles` to avoid a bug in TypeScript.
import Yoga, {
	type Node as YogaNode,
	type Align,
	type FlexDirection,
	type Justify,
	type Wrap,
} from 'yoga-layout';

export type Styles = {
	/*
	We keep this as a single enum so overflow is one complete choice and invalid combinations like wrap + truncate-middle are unrepresentable. In hindsight, `normal` would have been a clearer default value than `wrap`, since it describes the standard behavior instead of repeating the prop name.
	*/
	readonly textWrap?:
		| 'wrap'
		| 'hard'
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
		'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

	/**
	It makes possible to override the align-items value for specific flex items.
	See [align-self](https://css-tricks.com/almanac/properties/a/align-self/).
	*/
	readonly alignSelf?:
		'flex-start' | 'center' | 'flex-end' | 'auto' | 'stretch' | 'baseline';

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
	readonly minWidth?: number;

	/**
	Sets a minimum height of the element in lines (rows). You can also set it as a percentage, which will calculate the minimum height based on the height of the parent element.
	*/
	readonly minHeight?: number | string;

	/**
	Sets a maximum width of the element.
	Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.
	*/
	readonly maxWidth?: number;

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
	Change border background color. A shorthand for setting `borderTopBackgroundColor`, `borderRightBackgroundColor`, `borderBottomBackgroundColor`, and `borderLeftBackgroundColor`.
	*/
	readonly borderBackgroundColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change top border background color. Accepts the same values as `backgroundColor` in `Text` component.
	*/
	readonly borderTopBackgroundColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	Change bottom border background color. Accepts the same values as `backgroundColor` in `Text` component.
	*/
	readonly borderBottomBackgroundColor?: LiteralUnion<
		ForegroundColorName,
		string
	>;

	/**
	Change left border background color. Accepts the same values as `backgroundColor` in `Text` component.
	*/
	readonly borderLeftBackgroundColor?: LiteralUnion<
		ForegroundColorName,
		string
	>;

	/**
	Change right border background color. Accepts the same values as `backgroundColor` in `Text` component.
	*/
	readonly borderRightBackgroundColor?: LiteralUnion<
		ForegroundColorName,
		string
	>;

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
	Horizontal offset applied to the element's children, in columns. Children are shifted left by this amount. Combine with `overflow="hidden"` to build scrollable views.

	Offsets are terminal cell coordinates, so fractional values are truncated toward zero and non-finite values are treated as `0`.

	@default 0
	*/
	readonly contentOffsetX?: number;

	/**
	Vertical offset applied to the element's children, in rows. Children are shifted up by this amount. Combine with `overflow="hidden"` to build scrollable views.

	Offsets are terminal cell coordinates, so fractional values are truncated toward zero and non-finite values are treated as `0`.

	@default 0
	*/
	readonly contentOffsetY?: number;

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
		if (!Object.hasOwn(style, property)) {
			continue;
		}

		const value = style[property];

		if (typeof value === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
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
		node.setMargin(Yoga.EDGE_HORIZONTAL, style.marginX);
	}

	if ('marginY' in style) {
		node.setMargin(Yoga.EDGE_VERTICAL, style.marginY);
	}

	if ('marginLeft' in style) {
		node.setMargin(Yoga.EDGE_START, style.marginLeft);
	}

	if ('marginRight' in style) {
		node.setMargin(Yoga.EDGE_END, style.marginRight);
	}

	if ('marginTop' in style) {
		node.setMargin(Yoga.EDGE_TOP, style.marginTop);
	}

	if ('marginBottom' in style) {
		node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom);
	}
};

const applyPaddingStyles = (node: YogaNode, style: Styles): void => {
	if ('padding' in style) {
		node.setPadding(Yoga.EDGE_ALL, style.padding ?? 0);
	}

	if ('paddingX' in style) {
		node.setPadding(Yoga.EDGE_HORIZONTAL, style.paddingX);
	}

	if ('paddingY' in style) {
		node.setPadding(Yoga.EDGE_VERTICAL, style.paddingY);
	}

	if ('paddingLeft' in style) {
		node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft);
	}

	if ('paddingRight' in style) {
		node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight);
	}

	if ('paddingTop' in style) {
		node.setPadding(Yoga.EDGE_TOP, style.paddingTop);
	}

	if ('paddingBottom' in style) {
		node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom);
	}
};

const flexWrapValues = new Map<Styles['flexWrap'], Wrap>([
	['nowrap', Yoga.WRAP_NO_WRAP],
	['wrap', Yoga.WRAP_WRAP],
	['wrap-reverse', Yoga.WRAP_WRAP_REVERSE],
]);

const flexDirectionValues = new Map<Styles['flexDirection'], FlexDirection>([
	['row', Yoga.FLEX_DIRECTION_ROW],
	['row-reverse', Yoga.FLEX_DIRECTION_ROW_REVERSE],
	['column', Yoga.FLEX_DIRECTION_COLUMN],
	['column-reverse', Yoga.FLEX_DIRECTION_COLUMN_REVERSE],
]);

const alignItemsValues = new Map<Styles['alignItems'], Align>([
	['stretch', Yoga.ALIGN_STRETCH],
	['flex-start', Yoga.ALIGN_FLEX_START],
	['center', Yoga.ALIGN_CENTER],
	['flex-end', Yoga.ALIGN_FLEX_END],
	['baseline', Yoga.ALIGN_BASELINE],
]);

const alignSelfValues = new Map<Styles['alignSelf'], Align>([
	['auto', Yoga.ALIGN_AUTO],
	['flex-start', Yoga.ALIGN_FLEX_START],
	['center', Yoga.ALIGN_CENTER],
	['flex-end', Yoga.ALIGN_FLEX_END],
	['stretch', Yoga.ALIGN_STRETCH],
	['baseline', Yoga.ALIGN_BASELINE],
]);

const alignContentValues = new Map<Styles['alignContent'], Align>([
	['flex-start', Yoga.ALIGN_FLEX_START],
	['center', Yoga.ALIGN_CENTER],
	['flex-end', Yoga.ALIGN_FLEX_END],
	['space-between', Yoga.ALIGN_SPACE_BETWEEN],
	['space-around', Yoga.ALIGN_SPACE_AROUND],
	['space-evenly', Yoga.ALIGN_SPACE_EVENLY],
	['stretch', Yoga.ALIGN_STRETCH],
]);

const justifyContentValues = new Map<Styles['justifyContent'], Justify>([
	['flex-start', Yoga.JUSTIFY_FLEX_START],
	['center', Yoga.JUSTIFY_CENTER],
	['flex-end', Yoga.JUSTIFY_FLEX_END],
	['space-between', Yoga.JUSTIFY_SPACE_BETWEEN],
	['space-around', Yoga.JUSTIFY_SPACE_AROUND],
	['space-evenly', Yoga.JUSTIFY_SPACE_EVENLY],
]);

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
		const flexWrap = flexWrapValues.get(style.flexWrap);

		if (flexWrap !== undefined) {
			node.setFlexWrap(flexWrap);
		}
	}

	if ('flexDirection' in style) {
		const flexDirection = flexDirectionValues.get(style.flexDirection);

		if (flexDirection !== undefined) {
			node.setFlexDirection(flexDirection);
		}
	}

	if ('flexBasis' in style) {
		if (typeof style.flexBasis === 'number') {
			node.setFlexBasis(style.flexBasis);
		} else if (typeof style.flexBasis === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
			node.setFlexBasisPercent(Number.parseFloat(style.flexBasis));
		} else {
			node.setFlexBasisAuto();
		}
	}

	if ('alignItems' in style) {
		const alignItems =
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'center'`), and any falsy value means the default.
			style.alignItems
				? alignItemsValues.get(style.alignItems)
				: Yoga.ALIGN_STRETCH;

		if (alignItems !== undefined) {
			node.setAlignItems(alignItems);
		}
	}

	if ('alignSelf' in style) {
		const alignSelf =
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'center'`), and any falsy value means the default.
			style.alignSelf ? alignSelfValues.get(style.alignSelf) : Yoga.ALIGN_AUTO;

		if (alignSelf !== undefined) {
			node.setAlignSelf(alignSelf);
		}
	}

	if ('alignContent' in style) {
		// Keep wrapped lines top-packed by default; stretch can add surprising empty rows in fixed-height boxes.
		const alignContent =
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'center'`), and any falsy value means the default.
			style.alignContent
				? alignContentValues.get(style.alignContent)
				: Yoga.ALIGN_FLEX_START;

		if (alignContent !== undefined) {
			node.setAlignContent(alignContent);
		}
	}

	if (!('justifyContent' in style)) {
		return;
	}

	const justifyContent =
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'center'`), and any falsy value means the default.
		style.justifyContent
			? justifyContentValues.get(style.justifyContent)
			: Yoga.JUSTIFY_FLEX_START;

	if (justifyContent !== undefined) {
		node.setJustifyContent(justifyContent);
	}
};

const applyDimensionStyles = (node: YogaNode, style: Styles): void => {
	if ('width' in style) {
		if (typeof style.width === 'number') {
			node.setWidth(style.width);
		} else if (typeof style.width === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
			node.setWidthPercent(Number.parseFloat(style.width));
		} else {
			node.setWidthAuto();
		}
	}

	if ('height' in style) {
		if (typeof style.height === 'number') {
			node.setHeight(style.height);
		} else if (typeof style.height === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
			node.setHeightPercent(Number.parseFloat(style.height));
		} else {
			node.setHeightAuto();
		}
	}

	if ('minWidth' in style) {
		node.setMinWidth(style.minWidth ?? 0);
	}

	if ('minHeight' in style) {
		if (typeof style.minHeight === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
			node.setMinHeightPercent(Number.parseFloat(style.minHeight));
		} else {
			node.setMinHeight(style.minHeight ?? 0);
		}
	}

	if ('maxWidth' in style) {
		node.setMaxWidth(style.maxWidth);
	}

	if ('maxHeight' in style) {
		if (typeof style.maxHeight === 'string') {
			// eslint-disable-next-line unicorn/prefer-number-coercion -- Percentage strings like `'50%'` need `Number.parseFloat()`, because `Number('50%')` is `NaN`.
			node.setMaxHeightPercent(Number.parseFloat(style.maxHeight));
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
			style.display === 'none' ? Yoga.DISPLAY_NONE : Yoga.DISPLAY_FLEX,
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

	const hasBorder = Boolean(currentStyle.borderStyle);
	const borderWidth = hasBorder ? 1 : 0;

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
		node.setGap(Yoga.GUTTER_COLUMN, style.columnGap);
	}

	if ('rowGap' in style) {
		node.setGap(Yoga.GUTTER_ROW, style.rowGap);
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
