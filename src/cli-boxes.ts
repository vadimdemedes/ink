/**
	Style of the box border.
	*/
export interface BoxStyle {
	readonly topLeft: string;
	readonly topRight: string;
	readonly bottomLeft: string;
	readonly bottomRight: string;
	readonly left: string;
	readonly right: string;
	readonly top: string;
	readonly bottom: string;
}

/**
 * @example
 * ```
 * ┌────┐
 * │    │
 * └────┘
 * ```
 */
export const single: BoxStyle = {
	topLeft: '┌',
	topRight: '┐',
	bottomRight: '┘',
	bottomLeft: '└',
	left: '│',
	right: '│',
	top: '─',
	bottom: '─'
};

/**
 * @example
 * ```
 * ╔════╗
 * ║    ║
 * ╚════╝
 * ```
 */
export const double: BoxStyle = {
	topLeft: '╔',
	topRight: '╗',
	bottomRight: '╝',
	bottomLeft: '╚',
	left: '║',
	right: '║',
	top: '═',
	bottom: '═'
};

/**
 * @example
 * ```
 * ╭────╮
 * │    │
 * ╰────╯
 * ```
 */
export const round: BoxStyle = {
	topLeft: '╭',
	topRight: '╮',
	bottomRight: '╯',
	bottomLeft: '╰',
	left: '│',
	right: '│',
	top: '─',
	bottom: '─'
};

/**
 * @example
 * ```
 * ┏━━━━┓
 * ┃    ┃
 * ┗━━━━┛
 * ```
 */
export const bold: BoxStyle = {
	topLeft: '┏',
	topRight: '┓',
	bottomRight: '┛',
	bottomLeft: '┗',
	left: '┃',
	right: '┃',
	top: '━',
	bottom: '━'
};

/**
 * @example
 * ```
 * ╓────╖
 * ║    ║
 * ╙────╜
 * ```
 */
export const singleDouble: BoxStyle = {
	topLeft: '╓',
	topRight: '╖',
	bottomRight: '╜',
	bottomLeft: '╙',
	left: '║',
	right: '║',
	top: '─',
	bottom: '─'
};

/**
 * @example
 * ```
 * ╒════╕
 * │    │
 * ╘════╛
 * ```
 */
export const doubleSingle: BoxStyle = {
	topLeft: '╒',
	topRight: '╕',
	bottomRight: '╛',
	bottomLeft: '╘',
	left: '│',
	right: '│',
	top: '═',
	bottom: '═'
};

/**
 * @example
 * ```
 * +----+
 * |    |
 * +----+
 * ```
 */
export const classic: BoxStyle = {
	topLeft: '+',
	topRight: '+',
	bottomRight: '+',
	bottomLeft: '+',
	left: '|',
	right: '|',
	top: '-',
	bottom: '-'
};
