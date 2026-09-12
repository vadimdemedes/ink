import React, {forwardRef, useContext, type PropsWithChildren} from 'react';
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
};

/**
`<Box>` is an essential Ink component to build your layout. It's like `<div style="display: flex">` in the browser.
*/
const Box = forwardRef<DOMElement, PropsWithChildren<Props>>(
	(
		{
			children,
			backgroundColor,
			flexWrap = 'nowrap',
			flexDirection = 'row',
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			'aria-role': role,
			'aria-state': ariaState,
			...style
		},
		ref,
	) => {
		const {isScreenReaderEnabled} = useContext(accessibilityContext);
		const inheritedBackgroundColor = useContext(backgroundContext);
		const effectiveBackgroundColor =
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty background colors inherit from the parent too.
			backgroundColor || inheritedBackgroundColor;
		const label = ariaLabel ? <ink-text>{ariaLabel}</ink-text> : undefined;
		if (isScreenReaderEnabled && ariaHidden) {
			return null;
		}

		const boxElement = (
			<ink-box
				ref={ref}
				style={{
					flexWrap,
					flexDirection,
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
			>
				{isScreenReaderEnabled && label ? label : children}
			</ink-box>
		);

		// Provide this Box's background color or its inherited color to children via context
		return (
			<backgroundContext.Provider value={effectiveBackgroundColor}>
				{boxElement}
			</backgroundContext.Provider>
		);
	},
);

Box.displayName = 'Box';

export default Box;
