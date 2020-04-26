import React, {FC, ReactNode} from 'react';
import PropTypes from 'prop-types';

export interface TransformProps {
	readonly transform: (children: ReactNode) => ReactNode;
	readonly children: ReactNode;
}

/*
 * Transform a string representation of React components before they are written to output.
 */
export const Transform: FC<TransformProps> = ({children, transform}) => (
	<span
		style={{flexDirection: 'row'}}
		// @ts-ignore
		internal_transform={transform}
	>
		{children}
	</span>
);

Transform.propTypes = {
	transform: PropTypes.func.isRequired,
	children: PropTypes.node.isRequired
};
