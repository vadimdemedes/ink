import React, {FC, ReactNode, memo} from 'react';
import PropTypes from 'prop-types';

export interface TransformProps {
	readonly transform: (children: ReactNode) => ReactNode;
	readonly children: ReactNode;
}

/*
 * Transform a string representation of React components before they are written to output.
 */
const Transform: FC<TransformProps> = ({children, transform}) => (
	<span
		style={{flexGrow: 0, flexShrink: 1, flexDirection: 'row'}}
		// @ts-ignore
		internal_transform={transform}
	>
		{children}
	</span>
);

Transform.displayName = 'Transform';

Transform.propTypes = {
	transform: PropTypes.func.isRequired,
	children: PropTypes.node.isRequired
};

export default memo(Transform);
