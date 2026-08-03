import widestLine from 'widest-line';
import indentString from 'indent-string';
import Yoga from 'yoga-layout';
import wrapText, {
	wrapTextWithMetadata,
	type TextBoundary,
	type WrappedLineMetadata,
} from './wrap-text.js';
import getMaxWidth from './get-max-width.js';
import squashTextNodes, {
	squashTextNodesWithMetadata,
	type TextSegment,
} from './squash-text-nodes.js';
import renderBorder from './render-border.js';
import renderBackground from './render-background.js';
import {type DOMElement} from './dom.js';
import type Output from './output.js';

// If parent container is `<Box>`, text nodes will be treated as separate nodes in
// the tree and will have their own coordinates in the layout.
// To ensure text nodes are aligned correctly, take X and Y of the first text node
// and use it as offset for the rest of the nodes
// Only first node is taken into account, because other text nodes can't have margin or padding,
// so their coordinates will be relative to the first node anyway
const applyPaddingToText = (node: DOMElement, text: string): string => {
	const yogaNode = node.childNodes[0]?.yogaNode;

	if (yogaNode) {
		const offsetX = yogaNode.getComputedLeft();
		const offsetY = yogaNode.getComputedTop();
		text = '\n'.repeat(offsetY) + indentString(text, offsetX);
	}

	return text;
};

// Same offset as `applyPaddingToText`, but exposed so the semantic path can
// write the padding separately (as non-selectable cells) from the text itself.
const getTextOffset = (node: DOMElement): {x: number; y: number} => {
	const yogaNode = node.childNodes[0]?.yogaNode;

	if (yogaNode) {
		return {
			x: yogaNode.getComputedLeft(),
			y: yogaNode.getComputedTop(),
		};
	}

	return {x: 0, y: 0};
};

/**
Assigns stable numeric ids to selection flows during a single render.
*/
export type FlowState = {
	ids: Map<unknown, number>;
	next: number;
};

/**
Per-column selection metadata of one line of written text. `boundariesAfter`
holds the boundary immediately after each column, if any.
*/
export type LineSemantics = {
	selectable: boolean[];
	flowIds: Array<number | undefined>;
	boundariesAfter: Array<TextBoundary | undefined>;
};

const resolveFlowId = (flowKey: unknown, flows: FlowState): number => {
	let flowId = flows.ids.get(flowKey);

	if (flowId === undefined) {
		flowId = flows.next++;
		flows.ids.set(flowKey, flowId);
	}

	return flowId;
};

// Maps each output line's columns back to the source segments so every cell
// keeps the selection attributes of the node it originated from, then places
// boundaries: wrap/source-newline boundaries after each line's last column
// and explicit `selectionBreakAfter` boundaries after the segment that
// requested them.
const buildLineSemantics = (
	segments: TextSegment[],
	lines: WrappedLineMetadata[],
	flows: FlowState,
): LineSemantics[] => {
	const semantics: LineSemantics[] = lines.map(() => ({
		selectable: [],
		flowIds: [],
		boundariesAfter: [],
	}));

	let segmentIndex = 0;

	const segmentAt = (offset: number): TextSegment | undefined => {
		while (
			segmentIndex < segments.length &&
			segments[segmentIndex]!.visibleEnd <= offset
		) {
			segmentIndex++;
		}

		const segment = segments[segmentIndex];

		return segment && segment.visibleStart <= offset ? segment : undefined;
	};

	for (const [lineIndex, line] of lines.entries()) {
		const lineSemantics = semantics[lineIndex]!;

		for (let column = 0; column < line.visibleLength; column++) {
			const segment = segmentAt(line.visibleStart + column);

			lineSemantics.selectable.push(
				line.selectable && (segment?.attributes.selectable ?? true),
			);
			lineSemantics.flowIds.push(
				segment ? resolveFlowId(segment.attributes.flowKey, flows) : undefined,
			);
			lineSemantics.boundariesAfter.push(undefined);
		}
	}

	// A line's incoming boundary belongs after the previous line's last
	// column. Empty lines (e.g. from source newlines) have no column to hold
	// it, so walk back to the nearest line that does.
	for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
		const {boundary} = lines[lineIndex]!;

		if (!boundary) {
			continue;
		}

		let target = lineIndex - 1;

		while (target >= 0 && semantics[target]!.selectable.length === 0) {
			target--;
		}

		if (target >= 0) {
			const targetSemantics = semantics[target]!;

			targetSemantics.boundariesAfter[
				targetSemantics.boundariesAfter.length - 1
			] = boundary;
		}
	}

	for (const segment of segments) {
		const {breakAfter, joiner} = segment.attributes;

		if (!breakAfter) {
			continue;
		}

		const boundary: TextBoundary = {kind: breakAfter, joiner};
		const position = segment.visibleEnd - 1;
		let placed = false;

		for (const [lineIndex, line] of lines.entries()) {
			if (
				position >= line.visibleStart &&
				position < line.visibleStart + line.visibleLength
			) {
				// Explicit boundaries win over wrap boundaries at the same spot.
				semantics[lineIndex]!.boundariesAfter[position - line.visibleStart] =
					boundary;
				placed = true;
				break;
			}
		}

		if (!placed) {
			// The segment ends in whitespace consumed by wrapping; attach the
			// boundary to the last line that starts before it.
			let target = -1;

			for (const [lineIndex, line] of lines.entries()) {
				if (line.visibleStart <= position && line.visibleLength > 0) {
					target = lineIndex;
				}
			}

			if (target >= 0) {
				const targetSemantics = semantics[target]!;

				targetSemantics.boundariesAfter[
					targetSemantics.boundariesAfter.length - 1
				] = boundary;
			}
		}
	}

	return semantics;
};

export type OutputTransformer = (s: string, index: number) => string;

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

// After nodes are laid out, render each to output object, which later gets rendered to terminal
const renderNodeToOutput = (
	node: DOMElement,
	output: Output,
	options: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
		skipStaticElements: boolean;
		flows?: FlowState;
	},
) => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements,
		flows,
	} = options;

	if (skipStaticElements && node.internal_static) {
		return;
	}

	const {yogaNode} = node;

	if (yogaNode) {
		if (yogaNode.getDisplay() === Yoga.DISPLAY_NONE) {
			return;
		}

		// Left and top positions in Yoga are relative to their parent node
		const x = offsetX + yogaNode.getComputedLeft();
		const y = offsetY + yogaNode.getComputedTop();

		// Transformers are functions that transform final text output of each component
		// See Output class for logic that applies transformers
		let newTransformers = transformers;

		if (typeof node.internal_transform === 'function') {
			newTransformers = [node.internal_transform, ...transformers];
		}

		if (node.nodeName === 'ink-text') {
			if (flows) {
				// Semantic path: squash with per-node selection attributes and
				// carry them through wrapping, so nested `<Text>` props are not
				// lost when nodes are squashed into a single string.
				const {text: sourceText, segments} = squashTextNodesWithMetadata(node);

				if (sourceText.length > 0) {
					const maxWidth = getMaxWidth(yogaNode);
					const textWrap = node.style.textWrap ?? 'wrap';
					const wrapped = wrapTextWithMetadata(
						sourceText,
						maxWidth,
						textWrap,
						widestLine(sourceText) > maxWidth,
					);
					const semantics = buildLineSemantics(segments, wrapped.lines, flows);
					const textOffset = getTextOffset(node);

					if (textOffset.x > 0) {
						const padding = wrapped.text
							.split('\n')
							.map(line => (line.length > 0 ? ' '.repeat(textOffset.x) : ''))
							.join('\n');

						output.write(x, y + textOffset.y, padding, {
							transformers: newTransformers,
							selectable: false,
						});
					}

					output.write(x + textOffset.x, y + textOffset.y, wrapped.text, {
						transformers: newTransformers,
						semantics,
					});
				}

				return;
			}

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
				node.style.overflowX === 'hidden' || node.style.overflow === 'hidden';
			const clipVertically =
				node.style.overflowY === 'hidden' || node.style.overflow === 'hidden';

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
			for (const childNode of node.childNodes) {
				renderNodeToOutput(childNode as DOMElement, output, {
					offsetX: x,
					offsetY: y,
					transformers: newTransformers,
					skipStaticElements,
					flows,
				});
			}

			if (clipped) {
				output.unclip();
			}
		}
	}
};

export default renderNodeToOutput;
