import React, {forwardRef, useContext, type PropsWithChildren} from 'react';
import {type Except, type LiteralUnion} from 'type-fest';
import {type ForegroundColorName} from 'ansi-styles';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';
import {accessibilityContext} from './AccessibilityContext.js';
import {backgroundContext} from './BackgroundContext.js';

export type Props = Except<Styles, 'textWrap'> & {
	/**
	A label for the element for screen readers.
	*/
	readonly 'aria-label'?: string;

	/**
	Hide the element from screen readers.
	*/
	readonly 'aria-hidden'?: boolean;

	/**
	The role of the element.
	*/
	readonly 'aria-role'?:
		| 'button'
		| 'checkbox'
		| 'combobox'
		| 'list'
		| 'listbox'
		| 'listitem'
		| 'menu'
		| 'menuitem'
		| 'option'
		| 'progressbar'
		| 'radio'
		| 'radiogroup'
		| 'tab'
		| 'tablist'
		| 'table'
		| 'textbox'
		| 'timer'
		| 'toolbar';

	/**
	The state of the element.
	*/
	readonly 'aria-state'?: {
		readonly busy?: boolean;
		readonly checked?: boolean;
		readonly disabled?: boolean;
		readonly expanded?: boolean;
		readonly multiline?: boolean;
		readonly multiselectable?: boolean;
		readonly readonly?: boolean;
		readonly required?: boolean;
		readonly selected?: boolean;
	};

	/**
	 * Set the vertical scroll position.
	 */
	readonly scrollTop?: number;

	/**
	 * Set the horizontal scroll position.
	 */
	readonly scrollLeft?: number;

	/**
	 * Set the initial vertical scroll position.
	 * @default 'top'
	 */
	readonly initialScrollPosition?: 'top' | 'bottom';

	/**
	 * Character to render for the scrollbar thumb.
	 * @default '█'
	 */
	readonly scrollbarThumbCharacter?: string;

	/**
	 * Character to render for the scrollbar track.
	 * @default '│'
	 */
	readonly scrollbarTrackCharacter?: string;

	/**
	 * Color of the scrollbar thumb.
	 * @default 'white'
	 */
	readonly scrollbarThumbColor?: LiteralUnion<ForegroundColorName, string>;

	/**
	 * Color of the scrollbar track.
	 * @default 'gray'
	 */
	readonly scrollbarTrackColor?: LiteralUnion<ForegroundColorName, string>;
};

/**
`<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
*/
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	(
		{
			children,
			backgroundColor,
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			'aria-role': role,
			'aria-state': ariaState,
			initialScrollPosition = 'top',
			...style
		},
		ref,
	) => {
		const {isScreenReaderEnabled} = useContext(accessibilityContext);
		const label = ariaLabel ? <ink-text>{ariaLabel}</ink-text> : undefined;
		if (isScreenReaderEnabled && ariaHidden) {
			return null;
		}

		const boxElement = (
			<ink-box
				ref={ref}
				style={{
					flexWrap: 'nowrap',
					flexDirection: 'row',
					flexGrow: 0,
					flexShrink: 1,
					...style,
					initialScrollPosition,
					backgroundColor,
					overflowX: style.overflowX ?? style.overflow ?? 'visible',
					overflowY: style.overflowY ?? style.overflow ?? 'visible',
				}}
				internal_accessibility={{
					role,
					state: ariaState,
				}}
			>
				{isScreenReaderEnabled && label ? label : children}
			</ink-box>
		);

		// If this Box has a background color, provide it to children via context
		if (backgroundColor) {
			return (
				<backgroundContext.Provider value={backgroundColor}>
					{boxElement}
				</backgroundContext.Provider>
			);
		}

		return boxElement;
	},
);

Box.displayName = 'Box';

export default Box;
