import {measureText} from './measure-text';
import {wrapText} from './wrap-text';
import {getMaxWidth} from './get-max-width';
import {DOMNode} from './dom';

// Since we need to know the width of text container to wrap text, we have to calculate layout twice
// This function is executed after first layout calculation to reassign width and height of text nodes
export const calculateWrappedText = (node: DOMNode) => {
	if (node.nodeName !== '#text') {
		if (
			node.textContent &&
			typeof node.parentNode?.style.textWrap === 'string'
		) {
			const {yogaNode: parentYogaNode} = node.parentNode;
			const maxWidth = parentYogaNode ? getMaxWidth(parentYogaNode) : 0;
			const {yogaNode} = node;
			if (yogaNode) {
				const currentWidth = yogaNode.getComputedWidth();

				if (currentWidth > maxWidth) {
					const {textWrap} = node.parentNode.style;
					const wrappedText = wrapText(node.textContent, maxWidth, {
						textWrap
					});
					const {width, height} = measureText(wrappedText);

					yogaNode.setWidth(width);
					yogaNode.setHeight(height);
				}
			}
		}

		for (const childNode of node.childNodes) {
			calculateWrappedText(childNode);
		}
	}
};
