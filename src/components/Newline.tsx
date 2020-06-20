import React from 'react';
import type {FC} from 'react';

export interface Props {
	count?: number;
}

// Add a newline
const Newline: FC<Props> = ({count = 1}) => (
	<ink-text>{'\n'.repeat(count)}</ink-text>
);

Newline.displayName = 'Newline';

export default Newline;
