import React, {FC} from 'react';
import PropTypes from 'prop-types';

export interface NewlineProps {
	count?: number;
}

// Add a newline
const Newline: FC<NewlineProps> = ({count = 1}) => (
	<span>{'\n'.repeat(count)}</span>
);

Newline.displayName = 'Newline';

Newline.propTypes = {
	count: PropTypes.number
};

export default Newline;
