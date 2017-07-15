'use strict';

const PropTypes = require('prop-types');
const Component = require('./component');

class StringComponent extends Component {
	render() {
		return this.props.children;
	}
}

StringComponent.propTypes = {
	children: PropTypes.node // eslint-disable-line react/require-default-props
};

module.exports = StringComponent;
