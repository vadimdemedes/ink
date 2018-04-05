'use strict';

const chalk = require('chalk');
const StringComponent = require('../string-component');

class Bold extends StringComponent {
	renderString(children) {
		return chalk.bold(children);
	}
}

module.exports = Bold;
