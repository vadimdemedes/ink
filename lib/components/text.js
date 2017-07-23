'use strict';

const arrify = require('arrify');
const chalk = require('chalk');
const StringComponent = require('../string-component');

const methods = [
	'hex',
	'hsl',
	'hsv',
	'hwb',
	'rgb',
	'keyword',
	'bgHex',
	'bgHsl',
	'bgHsv',
	'bgHwb',
	'bgRgb',
	'bgKeyword'
];

class Text extends StringComponent {
	renderString(children) {
		Object.keys(this.props).forEach(method => {
			if (this.props[method]) {
				if (methods.includes(method)) {
					children = chalk[method].apply(chalk, arrify(this.props[method]))(children);
				} else if (typeof chalk[method] === 'function') {
					children = chalk[method](children);
				}
			}
		});

		return children;
	}
}

module.exports = Text;
