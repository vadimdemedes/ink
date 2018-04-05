'use strict';

const chalk = require('chalk');
const StringComponent = require('../string-component');

class Underline extends StringComponent {
	renderString(children) {
		return chalk.underline(children);
	}
}

module.exports = Underline;
