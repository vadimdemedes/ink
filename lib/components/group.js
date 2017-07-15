'use strict';

const PropTypes = require('prop-types');

const Group = ({children}) => children;

Group.propTypes = {
	children: PropTypes.node
};

module.exports = Group;
