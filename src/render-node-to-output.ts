import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import type {DOMElement} from './dom.js';
import type Output from './output.js';

const applyPaddingToText = (node: DOMElement, text: string): string => {
	const yogaNode = node.childNodes[0]?.yogaNode;

	if (yogaNode) {
		const offsetX = yogaNode.getComputedLeft();
		const offsetY = yogaNode.getComputedTop();
		text = '\n'.repeat(offsetY) + indentString(text, offsetX);
	}

	return text;
};

export type OutputTransformer = (s: string, index: number) => string;

type StickyNodeInfo = {
	node: DOMElement;
	offsetX: number;
	offsetY: number;
	transformers: OutputTransformer[];
	parentTop: number;
	parentBottom: number;
};

type ScrollContext = {
	containerX: number;
	containerY: number;
	containerWidth: number;
	containerHeight: number;
	borderTop: number;
	borderBottom: number;
	borderLeft: number;
	borderRight: number;
	scrollOffset: {x: number; y: number};
	stickyNodes: StickyNodeInfo[];
};

type PositionInfo = {
	x: number;
	y: number;
};

type BoundsInfo = {
	top: number;
	bottom: number;
};

type RenderContext = {
	output: Output;
	position: PositionInfo;
	transformers: OutputTransformer[];
	scrollContext: ScrollContext;
	parentBounds: BoundsInfo;
};

const calculateStickyPosition = (
	node: DOMElement,
	normalPosition: PositionInfo,
	scrollContext: ScrollContext,
	parentBounds: BoundsInfo,
): {x: number; y: number; visible: boolean} => {
	const {x: normalX, y: normalY} = normalPosition;
	const {top: _parentTop, bottom: parentBottom} = parentBounds;
	const {yogaNode} = node;
	if (!yogaNode) return {x: normalX, y: normalY, visible: true};

	const nodeHeight = yogaNode.getComputedHeight();

	const {containerY, containerHeight, borderTop, borderBottom} = scrollContext;

	const viewportTop = containerY + borderTop;
	const viewportBottom = containerY + containerHeight - borderBottom;

	let finalY = normalY;

	const stickyTop = node.style.top;

	if (stickyTop !== undefined) {
		const minY = viewportTop + stickyTop;
		finalY = Math.max(minY, normalY);

		const maxY = parentBottom - nodeHeight;
		finalY = Math.min(maxY, finalY);
	}

	const visible =
		finalY >= viewportTop && finalY + nodeHeight <= viewportBottom;

	return {x: normalX, y: finalY, visible};
};

const renderStickyNode = (node: DOMElement, context: RenderContext): void => {
	const {output, position, transformers, scrollContext, parentBounds} = context;
	const {x: offsetX, y: offsetY} = position;
	const {top: parentTop, bottom: parentBottom} = parentBounds;
	const {yogaNode} = node;
	if (!yogaNode || yogaNode.getDisplay() === Yoga.DISPLAY_NONE) return;

	const normalX = offsetX + yogaNode.getComputedLeft();
	const normalY = offsetY + yogaNode.getComputedTop();

	const {x, y, visible} = calculateStickyPosition(
		node,
		{x: normalX, y: normalY},
		scrollContext,
		{top: parentTop, bottom: parentBottom},
	);

	if (!visible) return;

	let newTransformers = transformers;
	if (typeof node.internal_transform === 'function') {
		newTransformers = [node.internal_transform, ...transformers];
	}

	if (node.nodeName === 'ink-box') {
		renderBackground(x, y, node, output);
		renderBorder(x, y, node, output);
	}

	for (const childNode of node.childNodes) {
		const child = childNode as DOMElement;
		const childYoga = child.yogaNode;

		if (!childYoga || childYoga.getDisplay() === Yoga.DISPLAY_NONE) continue;

		if (child.nodeName === 'ink-text') {
			let text = squashTextNodes(child);
			if (text.length > 0) {
				const currentWidth = widestLine(text);
				const maxWidth = getMaxWidth(childYoga);
				if (currentWidth > maxWidth) {
					const textWrap = child.style.textWrap ?? 'wrap';
					text = wrapText(text, maxWidth, textWrap);
				}

				text = applyPaddingToText(child, text);
				const childX = x + childYoga.getComputedLeft();
				const childY = y + childYoga.getComputedTop();
				const childTransformers =
					typeof child.internal_transform === 'function'
						? [child.internal_transform, ...newTransformers]
						: newTransformers;
				output.write(childX, childY, text, {transformers: childTransformers});
			}
		} else if (child.nodeName === 'ink-box') {
			const childX = x + childYoga.getComputedLeft();
			const childY = y + childYoga.getComputedTop();
			renderBackground(childX, childY, child, output);
			renderBorder(childX, childY, child, output);
			renderNodeToOutput(child, output, {
				offsetX: x,
				offsetY: y,
				transformers: newTransformers,
				skipStaticElements: false,
			});
		}
	}
};

export const renderNodeToScreenReaderOutput = (
	node: DOMElement,
	options: {
		parentRole?: string;
		skipStaticElements?: boolean;
	} = {},
): string => {
	if (options.skipStaticElements && node.internal_static) {
		return '';
	}

	if (node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE) {
		return '';
	}

	let output = '';

	if (node.nodeName === 'ink-text') {
		output = squashTextNodes(node);
	} else if (node.nodeName === 'ink-box' || node.nodeName === 'ink-root') {
		const separator =
			node.style.flexDirection === 'row' ||
			node.style.flexDirection === 'row-reverse'
				? ' '
				: '\n';

		const childNodes =
			node.style.flexDirection === 'row-reverse' ||
			node.style.flexDirection === 'column-reverse'
				? [...node.childNodes].reverse()
				: [...node.childNodes];

		output = childNodes
			.map(childNode => {
				const screenReaderOutput = renderNodeToScreenReaderOutput(
					childNode as DOMElement,
					{
						parentRole: node.internal_accessibility?.role,
						skipStaticElements: options.skipStaticElements,
					},
				);
				return screenReaderOutput;
			})
			.filter(Boolean)
			.join(separator);
	}

	if (node.internal_accessibility) {
		const {role, state} = node.internal_accessibility;

		if (state) {
			const stateKeys = Object.keys(state) as Array<keyof typeof state>;
			const stateDescription = stateKeys.filter(key => state[key]).join(', ');

			if (stateDescription) {
				output = `(${stateDescription}) ${output}`;
			}
		}

		if (role && role !== options.parentRole) {
			output = `${role}: ${output}`;
		}
	}

	return output;
};

const renderNodeToOutput = (
	node: DOMElement,
	output: Output,
	options: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
		skipStaticElements: boolean;
		scrollContext?: ScrollContext;
		parentTop?: number;
		parentBottom?: number;
	},
) => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements,
		scrollContext,
		parentTop = -Infinity,
		parentBottom = Infinity,
	} = options;

	if (skipStaticElements && node.internal_static) {
		return;
	}

	const {yogaNode} = node;

	if (yogaNode) {
		if (yogaNode.getDisplay() === Yoga.DISPLAY_NONE) {
			return;
		}

		const x = offsetX + yogaNode.getComputedLeft();
		const y = offsetY + yogaNode.getComputedTop();
		const nodeHeight = yogaNode.getComputedHeight();

		if (node.style.position === 'sticky' && scrollContext) {
			scrollContext.stickyNodes.push({
				node,
				offsetX,
				offsetY,
				transformers,
				parentTop,
				parentBottom,
			});
			return;
		}

		let newTransformers = transformers;

		if (typeof node.internal_transform === 'function') {
			newTransformers = [node.internal_transform, ...transformers];
		}

		if (node.nodeName === 'ink-text') {
			let text = squashTextNodes(node);

			if (text.length > 0) {
				const currentWidth = widestLine(text);
				const maxWidth = getMaxWidth(yogaNode);

				if (currentWidth > maxWidth) {
					const textWrap = node.style.textWrap ?? 'wrap';
					text = wrapText(text, maxWidth, textWrap);
				}

				text = applyPaddingToText(node, text);

				output.write(x, y, text, {transformers: newTransformers});
			}

			return;
		}

		let clipped = false;

		if (node.nodeName === 'ink-box') {
			renderBackground(x, y, node, output);
			renderBorder(x, y, node, output);

			const clipHorizontally =
				node.style.overflowX === 'hidden' ||
				node.style.overflow === 'hidden' ||
				node.style.overflowX === 'scroll' ||
				node.style.overflow === 'scroll';
			const clipVertically =
				node.style.overflowY === 'hidden' ||
				node.style.overflow === 'hidden' ||
				node.style.overflowY === 'scroll' ||
				node.style.overflow === 'scroll';

			if (clipHorizontally || clipVertically) {
				const x1 = clipHorizontally
					? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
					: undefined;

				const x2 = clipHorizontally
					? x +
						yogaNode.getComputedWidth() -
						yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
					: undefined;

				const y1 = clipVertically
					? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
					: undefined;

				const y2 = clipVertically
					? y +
						yogaNode.getComputedHeight() -
						yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
					: undefined;

				output.clip({x1, x2, y1, y2});
				clipped = true;
			}
		}

		if (node.nodeName === 'ink-root' || node.nodeName === 'ink-box') {
			const isScrollContainer =
				node.style.overflow === 'scroll' ||
				node.style.overflowX === 'scroll' ||
				node.style.overflowY === 'scroll';

			const scrollOffset =
				isScrollContainer && node.internal_scrollOffset
					? node.internal_scrollOffset
					: {x: 0, y: 0};

			const newScrollContext: ScrollContext | undefined = isScrollContainer
				? {
						containerX: x,
						containerY: y,
						containerWidth: yogaNode.getComputedWidth(),
						containerHeight: yogaNode.getComputedHeight(),
						borderTop: yogaNode.getComputedBorder(Yoga.EDGE_TOP),
						borderBottom: yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM),
						borderLeft: yogaNode.getComputedBorder(Yoga.EDGE_LEFT),
						borderRight: yogaNode.getComputedBorder(Yoga.EDGE_RIGHT),
						scrollOffset,
						stickyNodes: [],
					}
				: scrollContext;

			const childParentTop = y;
			const childParentBottom = y + nodeHeight;

			for (const childNode of node.childNodes) {
				renderNodeToOutput(childNode as DOMElement, output, {
					offsetX: x - scrollOffset.x,
					offsetY: y - scrollOffset.y,
					transformers: newTransformers,
					skipStaticElements,
					scrollContext: newScrollContext,
					parentTop: childParentTop,
					parentBottom: childParentBottom,
				});
			}

			if (isScrollContainer && newScrollContext) {
				for (const sticky of newScrollContext.stickyNodes) {
					renderStickyNode(sticky.node, {
						output,
						position: {x: sticky.offsetX, y: sticky.offsetY},
						transformers: sticky.transformers,
						scrollContext: newScrollContext,
						parentBounds: {top: sticky.parentTop, bottom: sticky.parentBottom},
					});
				}
			}

			if (clipped) {
				output.unclip();
			}
		}
	}
};

export default renderNodeToOutput;
