import widestLine from 'widest-line';
import {CURSOR_MARKER} from './cursor-marker.js';

const cache = new Map<string, Output>();

type Output = {
	width: number;
	height: number;
};

const measureText = (text: string): Output => {
	// Remove cursor marker before measuring to get accurate width
	// Only one marker should exist, so replace() is sufficient
	const textWithoutMarker = text.replace(CURSOR_MARKER, '');

	if (textWithoutMarker.length === 0) {
		return {
			width: 0,
			height: 0,
		};
	}

	// Use textWithoutMarker as cache key to avoid marker affecting cache
	const cachedDimensions = cache.get(textWithoutMarker);

	if (cachedDimensions) {
		return cachedDimensions;
	}

	const width = widestLine(textWithoutMarker);
	const height = textWithoutMarker.split('\n').length;
	const dimensions = {width, height};
	cache.set(textWithoutMarker, dimensions);

	return dimensions;
};

export default measureText;
