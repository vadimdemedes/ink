import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
import measureText from './measure-text';

const wrapText = node => {
	if (node.textContent && typeof node.parentNode.style.textWrap === 'string') {
		const {yogaNode} = node;
		const parentYogaNode = node.parentNode.yogaNode;

		const maxWidth = parentYogaNode.getComputedWidth() - (parentYogaNode.getComputedPadding() * 2);
		const currentWidth = yogaNode.getComputedWidth();

		if (currentWidth > maxWidth) {
			const {textWrap} = node.parentNode.style;
			let wrappedText = node.textContent;

			if (textWrap === 'wrap') {
				wrappedText = wrapAnsi(node.textContent, maxWidth, {
					trim: false,
					hard: true
				});
			}

			if (textWrap.startsWith('truncate')) {
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

				wrappedText = cliTruncate(node.textContent, maxWidth, {position});
			}

			const {width, height} = measureText(wrappedText);
			node.textContent = wrappedText;

			yogaNode.setWidth(width);
			yogaNode.setHeight(height);
		}

		return;
	}

	if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
		for (const childNode of node.childNodes) {
			wrapText(childNode);
		}
	}
};

export default wrapText;
