/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Yoga from 'yoga-layout';
import {type DOMElement} from './dom.js';

function calculateScrollDimensions(node: DOMElement): {
	scrollHeight: number;
	scrollWidth: number;
} {
	const {yogaNode} = node;
	if (!yogaNode) {
		return {scrollHeight: 0, scrollWidth: 0};
	}

	const top = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
	const left = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);

	let maxBottom = top;
	let maxRight = yogaNode.getComputedPadding(Yoga.EDGE_LEFT);

	for (let i = 0; i < yogaNode.getChildCount(); i++) {
		const child = yogaNode.getChild(i);
		const childBottom =
			child.getComputedTop() +
			child.getComputedHeight() +
			child.getComputedMargin(Yoga.EDGE_BOTTOM);

		if (childBottom > maxBottom) {
			maxBottom = childBottom;
		}

		const childRight =
			child.getComputedLeft() +
			child.getComputedWidth() +
			child.getComputedMargin(Yoga.EDGE_RIGHT);

		if (childRight > maxRight) {
			maxRight = childRight;
		}
	}

	const scrollHeight =
		maxBottom - top + yogaNode.getComputedPadding(Yoga.EDGE_BOTTOM);
	const scrollWidth =
		maxRight - left + yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);

	return {scrollHeight, scrollWidth};
}

export function getScrollHeight(node: DOMElement): number {
	return node.internal_scrollState?.scrollHeight ?? 0;
}

export function getScrollWidth(node: DOMElement): number {
	return node.internal_scrollState?.scrollWidth ?? 0;
}

export function calculateScroll(node: DOMElement): void {
	const {yogaNode} = node;
	if (!yogaNode) {
		return;
	}

	const {scrollHeight, scrollWidth} = calculateScrollDimensions(node);

	const clientHeight =
		yogaNode.getComputedHeight() -
		yogaNode.getComputedBorder(Yoga.EDGE_TOP) -
		yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

	const scrollTop = Math.max(
		0,
		Math.min(node.style.scrollTop ?? 0, scrollHeight - clientHeight),
	);

	const clientWidth =
		yogaNode.getComputedWidth() -
		yogaNode.getComputedBorder(Yoga.EDGE_LEFT) -
		yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);

	let scrollLeft = node.style.scrollLeft ?? 0;
	scrollLeft = Math.max(0, Math.min(scrollLeft, scrollWidth - clientWidth));

	node.internal_scrollState = {
		scrollHeight,
		scrollWidth,
		scrollTop,
		scrollLeft,
		clientHeight,
		clientWidth,
	};
}

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
