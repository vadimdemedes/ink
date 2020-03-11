import Yoga from 'yoga-layout-prebuilt';
import {Styles, FlexStyles, PaddingStyles, DimensionStyles} from './styles';

const applyMarginStyles = (node: Yoga.YogaNode, style: Styles) => {
	if (style.margin) {
		node.setMargin(Yoga.EDGE_TOP, style.margin);
		node.setMargin(Yoga.EDGE_BOTTOM, style.margin);
		node.setMargin(Yoga.EDGE_START, style.margin);
		node.setMargin(Yoga.EDGE_END, style.margin);
	}

	if (style.marginX) {
		node.setMargin(Yoga.EDGE_START, style.marginX);
		node.setMargin(Yoga.EDGE_END, style.marginX);
	}

	if (style.marginY) {
		node.setMargin(Yoga.EDGE_TOP, style.marginY);
		node.setMargin(Yoga.EDGE_BOTTOM, style.marginY);
	}

	if (style.marginTop) {
		node.setMargin(Yoga.EDGE_TOP, style.marginTop);
	}

	if (style.marginBottom) {
		node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom);
	}

	if (style.marginLeft) {
		node.setMargin(Yoga.EDGE_START, style.marginLeft);
	}

	if (style.marginRight) {
		node.setMargin(Yoga.EDGE_END, style.marginRight);
	}
};

const applyPaddingStyles = (
	node: Yoga.YogaNode,
	style: FlexStyles & PaddingStyles
) => {
	if (style.padding) {
		node.setPadding(Yoga.EDGE_TOP, style.padding);
		node.setPadding(Yoga.EDGE_BOTTOM, style.padding);
		node.setPadding(Yoga.EDGE_LEFT, style.padding);
		node.setPadding(Yoga.EDGE_RIGHT, style.padding);
	}

	if (style.paddingX) {
		node.setPadding(Yoga.EDGE_LEFT, style.paddingX);
		node.setPadding(Yoga.EDGE_RIGHT, style.paddingX);
	}

	if (style.paddingY) {
		node.setPadding(Yoga.EDGE_TOP, style.paddingY);
		node.setPadding(Yoga.EDGE_BOTTOM, style.paddingY);
	}

	if (style.paddingTop) {
		node.setPadding(Yoga.EDGE_TOP, style.paddingTop);
	}

	if (style.paddingBottom) {
		node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom);
	}

	if (style.paddingLeft) {
		node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft);
	}

	if (style.paddingRight) {
		node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight);
	}
};

const applyFlexStyles = (node: Yoga.YogaNode, style: FlexStyles) => {
	if (style.flexGrow) {
		node.setFlexGrow(style.flexGrow);
	}

	if (style.flexShrink) {
		node.setFlexShrink(style.flexShrink);
	}

	if (style.flexDirection) {
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

	if (style.flexBasis !== undefined) {
		node.setFlexBasis(style.flexBasis);
	}

	if (style.alignItems) {
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

	if (style.justifyContent) {
		if (style.justifyContent === 'flex-start') {
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

const applyDimensionStyles = (node: Yoga.YogaNode, style: DimensionStyles) => {
	if (style.width !== undefined) {
		node.setWidth(style.width);
	}

	if (style.height !== undefined) {
		node.setHeight(style.height);
	}

	if (style.minWidth !== undefined) {
		node.setMinWidth(style.minWidth);
	}

	if (style.minHeight !== undefined) {
		node.setMinHeight(style.minHeight);
	}
};

export default (node: Yoga.YogaNode, style: Styles = {}) => {
	applyMarginStyles(node, style);
	applyPaddingStyles(node, style);
	applyFlexStyles(node, style);
	applyDimensionStyles(node, style);
};
