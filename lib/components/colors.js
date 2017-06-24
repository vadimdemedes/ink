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

styles.forEach(style => {
	const capitalizedName = style[0].toUpperCase() + style.slice(1);
	exports[capitalizedName] = class extends StringComponent {
		renderString(children) {
			return chalk[style](children);
		}
	};

	exports[capitalizedName].displayName = capitalizedName;
});
