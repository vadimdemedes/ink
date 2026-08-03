import stripAnsi from 'strip-ansi';
import {type DOMElement} from './dom.js';
import sanitizeAnsi from './sanitize-ansi.js';

// Squashing text nodes allows to combine multiple text nodes into one and write
// to `Output` instance only once. For example, <Text>hello{' '}world</Text>
// is actually 3 text nodes, which would result 3 writes to `Output`.
//
// Also, this is necessary for libraries like ink-link (https://github.com/sindresorhus/ink-link),
// which need to wrap all children at once, instead of wrapping 3 text nodes separately.
const squashTextNodes = (node: DOMElement): string => {
	let text = '';

	for (let index = 0; index < node.childNodes.length; index++) {
		const childNode = node.childNodes[index];

		if (childNode === undefined) {
			continue;
		}

		let nodeText = '';

		if (childNode.nodeName === '#text') {
			nodeText = childNode.nodeValue;
		} else {
			if (
				childNode.nodeName === 'ink-text' ||
				childNode.nodeName === 'ink-virtual-text'
			) {
				nodeText = squashTextNodes(childNode);
			}

			// Since these text nodes are being concatenated, `Output` instance won't be able to
			// apply children transform, so we have to do it manually here for each text node
			if (
				nodeText.length > 0 &&
				typeof childNode.internal_transform === 'function'
			) {
				nodeText = childNode.internal_transform(nodeText, index);
			}
		}

		text += nodeText;
	}

	return sanitizeAnsi(text);
};

export default squashTextNodes;

/**
Selection attributes resolved for a segment of squashed text.
*/
export type TextSegmentAttributes = {
	selectable: boolean;
	flowKey: unknown;
	breakAfter?: 'soft' | 'hard';
	joiner: string;
};

/**
A run of squashed text originating from a single source node, carrying the
selection attributes effective at that node. `visibleStart`/`visibleEnd` are
offsets in the visible (ANSI-stripped) squashed text.
*/
export type TextSegment = {
	text: string;
	visibleStart: number;
	visibleEnd: number;
	attributes: TextSegmentAttributes;
};

export type SquashedText = {
	text: string;
	segments: TextSegment[];
};

type InheritedAttributes = {
	selectable: boolean;
	flowKey: unknown;
};

type CollectorState = {
	text: string;
	visibleLength: number;
	segments: TextSegment[];
};

const createState = (): CollectorState => ({
	text: '',
	visibleLength: 0,
	segments: [],
});

const appendSegment = (
	state: CollectorState,
	text: string,
	attributes: TextSegmentAttributes,
): void => {
	if (!text) {
		return;
	}

	const visibleLength = stripAnsi(text).length;

	state.text += text;

	if (visibleLength === 0) {
		return;
	}

	state.segments.push({
		text,
		visibleStart: state.visibleLength,
		visibleEnd: state.visibleLength + visibleLength,
		attributes: {...attributes},
	});
	state.visibleLength += visibleLength;
};

// Returns the attributes effective for `node`'s subtree, applying explicit
// `selectable`/`selectionFlow` overrides on top of the inherited ones.
const resolveAttributes = (
	node: DOMElement,
	inherited: InheritedAttributes,
): InheritedAttributes => {
	const {selectable, selectionFlow} = node.attributes;

	return {
		selectable:
			typeof selectable === 'boolean' ? selectable : inherited.selectable,
		flowKey: selectionFlow ?? inherited.flowKey,
	};
};

const collectChildren = (
	node: DOMElement,
	inherited: InheritedAttributes,
	state: CollectorState,
): void => {
	for (const [index, childNode] of node.childNodes.entries()) {
		if (childNode === undefined) {
			continue;
		}

		if (childNode.nodeName === '#text') {
			appendSegment(state, sanitizeAnsi(childNode.nodeValue), {
				...inherited,
				joiner: '',
			});
			continue;
		}

		if (
			childNode.nodeName !== 'ink-text' &&
			childNode.nodeName !== 'ink-virtual-text'
		) {
			continue;
		}

		collectTextSubtree(childNode, inherited, state, index);

		// A boundary requested after this node lands after the last visible
		// character emitted for its subtree (or after the preceding content
		// when the subtree emitted none).
		const breakAfter = childNode.attributes['selectionBreakAfter'];

		if (breakAfter === 'soft' || breakAfter === 'hard') {
			const lastSegment = state.segments.at(-1);

			if (lastSegment) {
				const joiner = childNode.attributes['selectionJoiner'];

				lastSegment.attributes.breakAfter = breakAfter;
				lastSegment.attributes.joiner =
					typeof joiner === 'string'
						? joiner
						: breakAfter === 'hard'
							? '\n'
							: '';
			}
		}
	}
};

const collectTextSubtree = (
	node: DOMElement,
	inherited: InheritedAttributes,
	state: CollectorState,
	index: number,
): void => {
	const attributes = resolveAttributes(node, inherited);
	const transform = node.internal_transform;

	if (typeof transform === 'function') {
		// Transforms may rewrite visible text arbitrarily (e.g. <Transform>),
		// in which case per-segment provenance cannot be preserved. Apply the
		// transform per segment and verify the visible result still matches a
		// whole-subtree application (as color transforms do); otherwise fall
		// back to one uniform segment to stay byte-identical with the plain
		// squashing path.
		const subState = createState();
		collectChildren(node, attributes, subState);

		if (subState.segments.length === 0) {
			if (subState.text.length > 0) {
				state.text += sanitizeAnsi(transform(subState.text, index));
			}

			return;
		}

		const wholeText = transform(subState.text, index);
		const transformedSegments = subState.segments.map(segment =>
			transform(segment.text, index),
		);

		const segmentVisible = transformedSegments
			.map(segment => stripAnsi(segment))
			.join('');

		if (segmentVisible === stripAnsi(wholeText)) {
			for (const [segmentIndex, segment] of subState.segments.entries()) {
				const transformed = transformedSegments[segmentIndex];

				appendSegment(
					state,
					sanitizeAnsi(transformed ?? segment.text),
					segment.attributes,
				);
			}

			return;
		}

		appendSegment(state, sanitizeAnsi(wholeText), {...attributes, joiner: ''});
		return;
	}

	collectChildren(node, attributes, state);
};

/**
Like `squashTextNodes`, but additionally tracks which selection attributes
(`selectable`, `selectionFlow`, `selectionBreakAfter`) are effective for each
run of the squashed text, so nested `<Text>` nodes keep their metadata.
*/
export const squashTextNodesWithMetadata = (node: DOMElement): SquashedText => {
	const state = createState();
	const attributes = resolveAttributes(node, {selectable: true, flowKey: node});

	collectChildren(node, attributes, state);

	const breakAfter = node.attributes['selectionBreakAfter'];

	if (breakAfter === 'soft' || breakAfter === 'hard') {
		const lastSegment = state.segments.at(-1);

		if (lastSegment) {
			const joiner = node.attributes['selectionJoiner'];

			lastSegment.attributes.breakAfter = breakAfter;
			lastSegment.attributes.joiner =
				typeof joiner === 'string' ? joiner : breakAfter === 'hard' ? '\n' : '';
		}
	}

	return {text: state.text, segments: state.segments};
};
