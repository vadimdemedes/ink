import React, {forwardRef, useContext, type PropsWithChildren} from 'react';
import {type Except} from 'type-fest';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';
import {accessibilityContext} from './AccessibilityContext.js';

export type Props = Except<Styles, 'textWrap'> & {
	/**
	 * Label for the element for screen readers.
	 */
	readonly 'aria-label'?: string;

	/**
	 * Hide the element from screen readers.
	 */
	readonly 'aria-hidden'?: boolean;

	/**
	 * Role of the element.
	 */
	readonly role?:
		| 'button'
		| 'checkbox'
		| 'radio'
		| 'radiogroup'
		| 'list'
		| 'listitem'
		| 'menu'
		| 'menuitem'
		| 'progressbar'
		| 'tab'
		| 'tablist'
		| 'timer'
		| 'toolbar'
		| 'table';

	/**
	 * State of the element.
	 */
	readonly 'aria-state'?: {
		readonly checked?: boolean;
		readonly disabled?: boolean;
		readonly expanded?: boolean;
		readonly selected?: boolean;
	};
};

/**
 * `<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
 */
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	(
		{
			children,
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			role,
			'aria-state': ariaState,
			...style
		},
		ref,
	) => {
		const {isScreenReaderEnabled} = useContext(accessibilityContext);
		const label = ariaLabel ? <ink-text>{ariaLabel}</ink-text> : undefined;

		return (
			<ink-box
				ref={ref}
				style={{
					flexWrap: 'nowrap',
					flexDirection: 'row',
					flexGrow: 0,
					flexShrink: 1,
					...style,
					overflowX: style.overflowX ?? style.overflow ?? 'visible',
					overflowY: style.overflowY ?? style.overflow ?? 'visible',
				}}
				internalAccessiblity={{
					hidden: ariaHidden,
					role,
					state: ariaState,
				}}
			>
				{isScreenReaderEnabled && label ? label : children}
			</ink-box>
		);
	},
);

Box.displayName = 'Box';

export default Box;
