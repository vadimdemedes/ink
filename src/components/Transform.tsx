import React from 'react';
import type {FC, ReactNode} from 'react';

export interface Props {
	readonly transform: (children: string) => string;
	readonly children: ReactNode;
}

/*
 * Transform a string representation of React components before they are written to output.
 */
const Transform: FC<Props> = ({children, transform}) => (
	<ink-text
		style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row'}}
		internal_transform={transform}
	>
		{children}
	</ink-text>
);

Transform.displayName = 'Transform';

export default Transform;
