import React from 'react';
import type {FC} from 'react';

export interface Props {
	count?: number;
}

// Add a newline
const Newline: FC<Props> = ({count = 1}) => <span>{'\n'.repeat(count)}</span>;

Newline.displayName = 'Newline';

export default Newline;
