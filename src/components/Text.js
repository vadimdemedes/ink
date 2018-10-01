import React from 'react';
import PropTypes from 'prop-types';
import chalk from 'chalk';
import Box from './Box';

const Text = ({bold, italic, underline, strikethrough, children}) => {
	const transformChildren = children => {
		if (bold) {
			children = chalk.bold(children);
		}

		if (italic) {
			children = chalk.italic(children);
		}

		if (underline) {
			children = chalk.underline(children);
		}

		if (strikethrough) {
			children = chalk.strikethrough(children);
		}

		return children;
	};

	return <Box unstable__transformChildren={transformChildren}>{children}</Box>;
};

Text.propTypes = {
	bold: PropTypes.bool,
	italic: PropTypes.bool,
	underline: PropTypes.bool,
	strikethrough: PropTypes.bool,
	children: PropTypes.node.isRequired
};

Text.defaultProps = {
	bold: false,
	italic: false,
	underline: false,
	strikethrough: false
};

export default Text;
