/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Yoga from 'yoga-layout';
import {type DOMElement} from './dom.js';
import {getScrollHeight, getScrollWidth} from './measure-element.js';

export function getScrollTop(node: DOMElement): number {
	const {yogaNode} = node;
	if (!yogaNode) {
		return 0;
	}

	const clientHeight =
		yogaNode.getComputedHeight() -
		yogaNode.getComputedBorder(Yoga.EDGE_TOP) -
		yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const scrollHeight = getScrollHeight(node);

	let {scrollTop} = node.style;
	if (typeof scrollTop !== 'number') {
		scrollTop = 0;
	}

	return Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));
}

export function getScrollLeft(node: DOMElement): number {
	const {yogaNode} = node;
	if (!yogaNode) {
		return 0;
	}

	const clientWidth =
		yogaNode.getComputedWidth() -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	const scrollWidth = getScrollWidth(node);
	const scrollLeft = node.style.scrollLeft ?? 0;
	return Math.max(0, Math.min(scrollLeft, scrollWidth - clientWidth));
}
