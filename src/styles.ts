export interface WrapTextStyles {
	textWrap?:
	| 'wrap'
	| 'end'
	| 'middle'
	| 'truncate-end'
	| 'truncate'
	| 'truncate-middle'
	| 'truncate-start';
}

export interface PositionStyles {
	position?: 'absolute' | 'relative';
}

export interface MarginStyles {
	margin?: number;
	marginX?: number;
	marginY?: number;
	marginTop?: number;
	marginBottom?: number;
	marginLeft?: number;
	marginRight?: number;
}

export interface PaddingStyles {
	padding?: number;
	paddingX?: number;
	paddingY?: number;
	paddingTop?: number;
	paddingBottom?: number;
	paddingLeft?: number;
	paddingRight?: number;
}

export interface FlexStyles {
	flexGrow?: number;
	flexShrink?: number;
	flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
	flexBasis?: number | string;
	alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
	justifyContent?:
	| 'flex-start'
	| 'flex-end'
	| 'space-between'
	| 'space-around'
	| 'center';
}

export interface DimensionStyles {
	width?: number | string;
	height?: number | string;
	minWidth?: number | string;
	minHeight?: number | string;
}

export type Styles = PaddingStyles &
MarginStyles &
FlexStyles &
DimensionStyles &
PositionStyles &
WrapTextStyles;
