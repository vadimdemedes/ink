'use strict';

const StringComponent = require('../string-component');

class Bar extends StringComponent {
	renderString() {
		const screen = this.props.columns || process.stdout.columns || 80;
		const left = this.props.left || 0;
		const right = this.props.right || 0;
		const char = this.props.char || '█';
		const space = screen - right - left;
		const percent = this.props.percent == null ? 1 : this.props.percent;
		let str = '';
		const max = Math.min(Math.floor(space * percent), space);
		for (let i = 0; i < max; i++) {
			str += char;
		}

		return str;
	}
}

module.exports = Bar;
