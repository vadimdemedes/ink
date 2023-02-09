import React from 'react';

export type Props = {
	/**
	 * Number of newlines to insert.
	 *
	 * @default 1
	 */
	readonly count?: number;
};

/**
 * Adds one or more newline (\n) characters. Must be used within <Text> components.
 */
function Newline({count = 1}: Props) {
	return <ink-text>{'\n'.repeat(count)}</ink-text>;
}

Newline.displayName = 'Newline';

export default Newline;
