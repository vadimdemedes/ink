'use strict';

const Component = require('./component');

class StringComponent extends Component {
	render() {
		return this.props.children;
	}
}

module.exports = StringComponent;
