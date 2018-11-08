import Yoga from 'yoga-layout-prebuilt';
import widestLine from 'widest-line';
import undom from 'undom';
import applyStyles from './apply-styles';
import Output from './output';
import cloneElement from './clone-element';

const buildElement = (element, {config, terminalWidth, skipStaticElements}) => {
	const node = Yoga.Node.create(config);
	const style = element.style || {};
	element.yogaNode = node;

	// Root element of the tree
	if (element.nodeName === 'BODY') {
		node.setWidth(terminalWidth);

		if (element.childNodes.length > 0) {
			const childNodes = element.childNodes.filter(childNode => {
				return skipStaticElements ? !childNode.static : true;
			});

			for (const [index, childNode] of Object.entries(childNodes)) {
				const {yogaNode} = buildElement(childNode, {config, terminalWidth, skipStaticElements});
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
		const childNodes = element.childNodes.filter(childNode => {
			return skipStaticElements ? !childNode.static : true;
		});

		for (const [index, childNode] of Object.entries(childNodes)) {
			const {yogaNode} = buildElement(childNode, {config, terminalWidth, skipStaticElements});
			node.insertChild(yogaNode, index);
		}
	}

	return element;
};

const renderElement = (element, output, offsetX = 0, offsetY = 0, {transformers, skipStaticElements}) => {
	if (element.static && skipStaticElements) {
		return;
	}

	const node = element.yogaNode;
	const x = offsetX + node.getComputedLeft();
	const y = offsetY + node.getComputedTop();

	let newTransformers = transformers;
	if (element.unstable__transformChildren) {
		newTransformers = [element.unstable__transformChildren, ...transformers];
	}

	// Element with a text node
	if (element.textContent && element.nodeName !== '#text') {
		output.write(x, y, element.textContent, {transformers: newTransformers, skipStaticElements});
		return;
	}

	// Text node
	if (element.nodeName === '#text') {
		output.write(x, y, element.nodeValue, {transformers: newTransformers, skipStaticElements});
		return;
	}

	// All the other elements who have children
	for (const childElement of element.childNodes) {
		renderElement(childElement, output, x, y, {transformers: newTransformers, skipStaticElements});
	}
};

const getStaticElements = element => {
	const staticElements = [];

	for (const childNode of element.childNodes) {
		if (childNode.static) {
			staticElements.push(childNode);
		}

		if (childNode.childNodes.length > 0) {
			staticElements.push(...getStaticElements(childNode));
		}
	}

	return staticElements;
};

export default ({terminalWidth}) => {
	const config = Yoga.Config.create();

	// Used to free up memory used by last node tree
	let lastNode;
	let lastStaticNode;

	return element => {
		if (lastNode) {
			lastNode.freeRecursive();
		}

		if (lastStaticNode) {
			lastStaticNode.freeRecursive();
		}

		const staticElements = getStaticElements(element);
		if (staticElements.length > 1) {
			console.error('Warning: There can only be one <Static> component');
		}

		let staticOutput;
		if (staticElements.length === 1) {
			const document = undom();
			document.body.appendChild(cloneElement(document, staticElements[0]));

			const staticNode = buildElement(document.body, {
				config,
				terminalWidth,
				skipStaticElements: false
			}).yogaNode;

			staticNode.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

			// Save current node tree to free up memory later
			lastStaticNode = staticNode;

			staticOutput = new Output({
				height: staticNode.getComputedHeight()
			});

			renderElement(document.body, staticOutput, 0, 0, {
				transformers: [],
				skipStaticElements: false
			});
		}

		const node = buildElement(element, {
			config,
			terminalWidth,
			skipStaticElements: true
		}).yogaNode;

		node.calculateLayout(Yoga.UNDEFINED, Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

		// Save current node tree to free up memory later
		lastNode = node;

		const output = new Output({
			height: node.getComputedHeight()
		});

		renderElement(element, output, 0, 0, {
			transformers: [],
			skipStaticElements: true
		});

		return {
			output: output.get(),
			staticOutput: staticOutput ? staticOutput.get() : undefined
		};
	};
};
