'use strict';

const PropTypes = require('prop-types');

const Span = ({children}) => children;

Span.propTypes = {
	children: PropTypes.node
};

module.exports = Span;
