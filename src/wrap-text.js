import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';

export default (text, maxWidth, {textWrap} = {}) => {
	if (textWrap === 'wrap') {
		return wrapAnsi(text, maxWidth, {
			trim: false,
			hard: true
		});
	}

	if (String(textWrap).startsWith('truncate')) {
		let position;

		if (textWrap === 'truncate' || textWrap === 'truncate-end') {
			position = 'end';
		}

		if (textWrap === 'truncate-middle') {
			position = 'middle';
		}

		if (textWrap === 'truncate-start') {
			position = 'start';
		}

		return cliTruncate(text, maxWidth, {position});
	}

	return text;
};
