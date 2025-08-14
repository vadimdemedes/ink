import React, {useContext, type ReactNode} from 'react';
import {accessibilityContext} from './AccessibilityContext.js';

export type Props = {
	/**
	 * Screen-reader-specific text to output.
	 * If this is set, all children will be ignored.
	 */
	readonly accessibilityLabel?: string;

	/**
	 * Function which transforms children output. It accepts children and must return transformed children too.
	 */
	readonly transform: (children: string, index: number) => string;

	readonly children?: ReactNode;
};

/**
 * Transform a string representation of React components before they are written to output.
 * For example, you might want to apply a gradient to text, add a clickable link or create some text effects.
 * These use cases can't accept React nodes as input, they are expecting a string.
 * That's what <Transform> component does, it gives you an output string of its child components and lets you transform it in any way.
 */
export default function Transform({
	children,
	transform,
	accessibilityLabel,
}: Props) {
	const {isScreenReaderEnabled} = useContext(accessibilityContext);

	if (children === undefined || children === null) {
		return null;
	}

	return (
		<ink-text
			style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row'}}
			internal_transform={transform}
		>
			{isScreenReaderEnabled && accessibilityLabel
				? accessibilityLabel
				: children}
		</ink-text>
	);
}
