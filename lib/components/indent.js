'use strict';

const indentString = require('indent-string');
const StringComponent = require('../string-component');

class Indent extends StringComponent {
	renderString(children) {
		return indentString(children, this.props.size, this.props.indent);
	}
}

module.exports = Indent;
