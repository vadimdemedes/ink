import Yoga from 'yoga-layout';
import reconciler from './reconciler.js';
import {type ClickEvent, type ClickHandler, type DOMElement} from './dom.js';

type MouseInput = {
	readonly x: number;
	readonly y: number;
	readonly button: 'left';
};

type NodeBounds = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

const sgrMousePrefix = '\u001B[<';

export const enableMouseTracking = '\u001B[?1000h\u001B[?1006h';
export const disableMouseTracking = '\u001B[?1000l\u001B[?1006l';

export const isMouseInput = (input: string): boolean =>
	input.startsWith(sgrMousePrefix) &&
	(input.endsWith('M') || input.endsWith('m'));

export const parseMouseInput = (input: string): MouseInput | undefined => {
	if (!isMouseInput(input)) {
		return undefined;
	}

	const parameters = input.slice(sgrMousePrefix.length, -1).split(';');

	if (parameters.length !== 3 || parameters.includes('')) {
		return undefined;
	}

	const [buttonCodeParameter, xParameter, yParameter] = parameters;
	const buttonCode = Number(buttonCodeParameter);
	const x = Number(xParameter);
	const y = Number(yParameter);
	const isPress = input.endsWith('M');
	const button = buttonCode % 4;
	const isMotion = Math.floor(buttonCode / 32) % 2 === 1;

	if (
		!Number.isInteger(buttonCode) ||
		!Number.isInteger(x) ||
		!Number.isInteger(y) ||
		!isPress ||
		button !== 0 ||
		isMotion
	) {
		return undefined;
	}

	return {
		x: x - 1,
		y: y - 1,
		button: 'left',
	};
};

export const hasClickHandler = (node: DOMElement): boolean => {
	if (typeof node.attributes['onClick'] === 'function') {
		return true;
	}

	return node.childNodes.some(childNode => {
		if (childNode.nodeName === '#text') {
			return false;
		}

		return hasClickHandler(childNode);
	});
};

export const dispatchClick = (
	rootNode: DOMElement,
	mouseInput: MouseInput,
): boolean => {
	const target = findDeepestClickableNode(rootNode, mouseInput);

	if (!target) {
		return false;
	}

	let isPropagationStopped = false;
	const event: ClickEvent = {
		...mouseInput,
		target,
		currentTarget: target,
		stopPropagation() {
			isPropagationStopped = true;
		},
	};

	// @ts-expect-error Types require 5 arguments (fn, a, b, c, d) but only fn is needed at runtime.
	reconciler.discreteUpdates(() => {
		let currentNode: DOMElement | undefined = target;

		while (currentNode) {
			const handler = currentNode.attributes['onClick'] as
				| ClickHandler
				| undefined;

			if (handler) {
				event.currentTarget = currentNode;
				handler(event);
			}

			if (isPropagationStopped) {
				break;
			}

			currentNode = currentNode.parentNode;
		}
	});

	return true;
};

const findDeepestClickableNode = (
	node: DOMElement,
	point: MouseInput,
	offsetX = 0,
	offsetY = 0,
): DOMElement | undefined => {
	if (node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE) {
		return undefined;
	}

	const bounds = getBounds(node, offsetX, offsetY);

	if (node.nodeName !== 'ink-root' && !isPointInsideBounds(point, bounds)) {
		return undefined;
	}

	for (const childNode of [...node.childNodes].reverse()) {
		if (childNode.nodeName === '#text') {
			continue;
		}

		const match = findDeepestClickableNode(
			childNode,
			point,
			bounds.x,
			bounds.y,
		);

		if (match) {
			return match;
		}
	}

	if (typeof node.attributes['onClick'] === 'function') {
		return node;
	}

	return undefined;
};

const getBounds = (
	node: DOMElement,
	offsetX: number,
	offsetY: number,
): NodeBounds => ({
	x: offsetX + (node.yogaNode?.getComputedLeft() ?? 0),
	y: offsetY + (node.yogaNode?.getComputedTop() ?? 0),
	width: node.yogaNode?.getComputedWidth() ?? 0,
	height: node.yogaNode?.getComputedHeight() ?? 0,
});

const isPointInsideBounds = (point: MouseInput, bounds: NodeBounds): boolean =>
	point.x >= bounds.x &&
	point.x < bounds.x + bounds.width &&
	point.y >= bounds.y &&
	point.y < bounds.y + bounds.height;
