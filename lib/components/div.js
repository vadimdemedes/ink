'use strict';

const PropTypes = require('prop-types');

const Div = ({children}) => [children, '\n'];

Div.propTypes = {
	children: PropTypes.node
};

module.exports = Div;
