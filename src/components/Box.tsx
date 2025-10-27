import React, {
	forwardRef,
	useContext,
	type PropsWithChildren,
	type ReactNode,
} from 'react';
import {type Except} from 'type-fest';
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
	 * Make the element opaque even if no background color is specified.
	 */
	readonly opaque?: boolean;

	/**
	 * Make the element sticky.
	 */
	readonly sticky?: boolean;

	/**
	 * Content to render when the element is sticky.
	 */
	readonly stickyChildren?: ReactNode;
};

/**
`<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
*/
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	(
		{
			children,
			stickyChildren,
			backgroundColor,
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			'aria-role': role,
			'aria-state': ariaState,
			sticky,
			opaque,
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
					backgroundColor,
					overflowX: style.overflowX ?? style.overflow ?? 'visible',
					overflowY: style.overflowY ?? style.overflow ?? 'visible',
				}}
				internal_accessibility={{
					role,
					state: ariaState,
				}}
				sticky={sticky}
				opaque={opaque}
			>
				{isScreenReaderEnabled && label ? label : children}
				{sticky && stickyChildren && !isScreenReaderEnabled && (
					<ink-box
						internalStickyAlternate
						style={{
							position: 'absolute',
							...style,
						}}
					>
						{stickyChildren}
					</ink-box>
				)}
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
