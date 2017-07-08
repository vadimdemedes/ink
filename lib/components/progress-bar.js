'use strict';

const blacklist = require('blacklist');
const Component = require('../component');
const h = require('../h');
const Text = require('./text');

const PROPS = ['percent', 'left', 'right', 'columns', 'character'];

class Bar extends Component {
	getString() {
		const {
			percent = 1,
			left = 0,
			right = 0,
			character = '█'
		} = this.props;
		const screen = this.props.columns || process.stdout.columns || 80;
		const space = screen - right - left;
		const max = Math.min(Math.floor(space * percent), space);
		return character.repeat(max);
	}

	render() {
		const props = blacklist(this.props, PROPS);
		return h(Text, props, this.getString());
	}
}

module.exports = Bar;

