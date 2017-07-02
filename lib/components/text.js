'use strict';

const chalk = require('chalk');
const StringComponent = require('../string-component');

const styles = [
	'bold',
	'dim',
	'italic',
	'underline',
	'inverse',
	'strikethrough',
	'black',
	'red',
	'green',
	'yellow',
	'blue',
	'magenta',
	'cyan',
	'white',
	'gray',
	'bgBlack',
	'bgRed',
	'bgGreen',
	'bgYellow',
	'bgBlue',
	'bgMagenta',
	'bgCyan',
	'bgWhite'
];

class Text extends StringComponent {
	renderString(children) {
		Object.keys(this.props).forEach(style => {
			if (this.props[style] === true && styles.includes(style)) {
				children = chalk[style](children);
			}
		});

		return children;
	}
}

module.exports = Text;
