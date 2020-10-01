import React, {FC} from 'react';

export interface Props {
	/**
	 * Number of newlines to insert.
	 *
	 * @default 1
	 */
	readonly count?: number;
}

/**
 * Adds one or more newline (\n) characters. Must be used within <Text> components.
 */
const Newline: FC<Props> = ({count = 1}) => (
	<ink-text>{'\n'.repeat(count)}</ink-text>
);

Newline.displayName = 'Newline';

export default Newline;
