'use strict';

const StringComponent = require('../string-component');

class Bar extends StringComponent {
	renderString() {
		const {
			percent = 1,
			left = 0,
			right = 0,
			char = '█'
		} = this.props;
		const screen = this.props.columns || process.stdout.columns || 80;
		const space = screen - right - left;
		let str = '';
		const max = Math.min(Math.floor(space * percent), space);
		for (let i = 0; i < max; i++) {
			str += char;
		}

		return str;
	}
}

module.exports = Bar;

