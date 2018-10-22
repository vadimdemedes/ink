import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import applyStyles from './apply-styles';
import Output from './output';

const buildElement = (element, {config, terminalWidth}) => {
	const node = Yoga.Node.create(config);
	const style = element.style || {};
	element.yogaNode = node;

	// Root element of the tree
	if (element.nodeName === 'BODY') {
		node.setWidth(terminalWidth);

		if (element.childNodes.length > 0) {
			for (const [index, childNode] of Object.entries(element.childNodes)) {
				const {yogaNode} = buildElement(childNode, {config, terminalWidth});
				node.insertChild(yogaNode, index);
			}
		}

		return element;
	}

	// Element which has text node as the only child
	if (element.textContent) {
		const width = widestLine(element.textContent);
		const height = element.textContent.split('\n').length;
		node.setWidth(style.width || width);
		node.setHeight(style.height || height);

		applyStyles(node, style);

		return element;
	}

	// Text node
	if (element.nodeValue) {
		const width = widestLine(element.nodeValue);
		const height = element.nodeValue.split('\n').length;
		node.setWidth(width);
		node.setHeight(height);

		applyStyles(node, style);

		return element;
	}

	// All the other elements
	if (style.width) {
		node.setWidth(style.width);
	}

	if (style.height) {
		node.setHeight(style.height);
	}

	applyStyles(node, style);

	if (element.childNodes.length > 0) {
		for (const [index, childNode] of Object.entries(element.childNodes)) {
			const {yogaNode} = buildElement(childNode, {config, terminalWidth});
			node.insertChild(yogaNode, index);
		}
	}

	return element;
};

const renderElement = (element, output, offsetX = 0, offsetY = 0, {transformers}) => {
	const node = element.yogaNode;
	const x = offsetX + node.getComputedLeft();
	const y = offsetY + node.getComputedTop();

	let newTransformers = transformers;
	if (element.unstable__transformChildren) {
		newTransformers = [element.unstable__transformChildren, ...transformers];
	}

	// Element with a text node
	if (element.textContent && element.nodeName !== '#text') {
		output.write(x, y, element.textContent, {transformers: newTransformers});
		return;
	}

	// Text node
	if (element.nodeName === '#text') {
		output.write(x, y, element.nodeValue, {transformers: newTransformers});
		return;
	}

	// All the other elements who have children
	for (const childElement of element.childNodes) {
		renderElement(childElement, output, x, y, {transformers: newTransformers});
	}
};

export default ({terminalWidth}) => {
	const config = Yoga.Config.create();

	// Used to free up memory used by last node tree
	let lastNode;

	return element => {
		if (lastNode) {
			lastNode.freeRecursive();
		}

		const node = buildElement(element, {config, terminalWidth}).yogaNode;
		node.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		// Save current node tree to free up memory later
		lastNode = node;

		const output = new Output({
			height: node.getComputedHeight()
		});

		renderElement(element, output, 0, 0, {transformers: []});
		return output.get();
	};
};
