import React, {
	forwardRef,
	useContext,
	useRef,
	useImperativeHandle,
	useLayoutEffect,
	useReducer,
	type PropsWithChildren,
} from 'react';
import {type Except} from 'type-fest';
import {type Styles} from '../styles.js';
import {type DOMElement} from '../dom.js';
import {accessibilityContext} from './AccessibilityContext.js';
import {backgroundContext} from './BackgroundContext.js';

export type BoxRef = DOMElement & {
	scrollTo: (options: {x?: number; y?: number}) => void;
	getScrollPosition: () => {x: number; y: number};
};

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
const Box = forwardRef<BoxRef, PropsWithChildren<Props>>(
	(
		{
			children,
			backgroundColor,
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			'aria-role': role,
			'aria-state': ariaState,
			...style
		},
		ref,
	) => {
		const internalRef = useRef<DOMElement>(null);
		const scrollStateRef = useRef({x: 0, y: 0});
		const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

		useImperativeHandle(ref, () => {
			const element = internalRef.current;
			if (!element) {
				return null as unknown as BoxRef;
			}

			return Object.assign(element, {
				scrollTo({x, y}: {x?: number; y?: number}) {
					if (x !== undefined) scrollStateRef.current.x = x;
					if (y !== undefined) scrollStateRef.current.y = y;

					element.internal_scrollOffset = {
						...scrollStateRef.current,
					};

					forceUpdate();
				},
				getScrollPosition() {
					return {...scrollStateRef.current};
				},
			});
		}, []);

		const isScrollContainer =
			style.overflow === 'scroll' ||
			style.overflowX === 'scroll' ||
			style.overflowY === 'scroll';

		useLayoutEffect(() => {
			if (internalRef.current && isScrollContainer) {
				internalRef.current.internal_scrollOffset = scrollStateRef.current;
			}
		});

		const {isScreenReaderEnabled} = useContext(accessibilityContext);
		const label = ariaLabel ? <ink-text>{ariaLabel}</ink-text> : undefined;
		if (isScreenReaderEnabled && ariaHidden) {
			return null;
		}

		const boxElement = (
			<ink-box
				ref={internalRef}
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
			>
				{isScreenReaderEnabled && label ? label : children}
			</ink-box>
		);

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
