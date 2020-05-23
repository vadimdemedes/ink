import React from 'react';
import type {FC} from 'react';
import PropTypes from 'prop-types';

export interface Props {
	count?: number;
}

// Add a newline
const Newline: FC<Props> = ({count = 1}) => <span>{'\n'.repeat(count)}</span>;

Newline.displayName = 'Newline';

Newline.propTypes = {
	count: PropTypes.number
};

export default Newline;
