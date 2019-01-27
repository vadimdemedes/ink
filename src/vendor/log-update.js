// Fork of `log-update` without `wrap-ansi` until https://github.com/chalk/wrap-ansi/issues/27 is closed
'use strict';
const ansiEscapes = require('ansi-escapes');
const cliCursor = require('cli-cursor');

const main = (stream, options) => {
	options = {showCursor: false, ...options};

	let prevLineCount = 0;

	const render = function () {
		if (!options.showCursor) {
			cliCursor.hide();
		}

		const out = [].join.call(arguments, ' ') + '\n'; // eslint-disable-line prefer-rest-params
		stream.write(ansiEscapes.eraseLines(prevLineCount) + out);
		prevLineCount = out.split('\n').length;
	};

	render.clear = () => {
		stream.write(ansiEscapes.eraseLines(prevLineCount));
		prevLineCount = 0;
	};

	render.done = () => {
		prevLineCount = 0;

		if (!options.showCursor) {
			cliCursor.show();
		}
	};

	return render;
};

module.exports = main(process.stdout);
module.exports.stderr = main(process.stderr);
module.exports.create = main;
