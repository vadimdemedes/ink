import {loadYoga, type Yoga as YogaType} from 'yoga-layout/load';

// Re-export enums - these are available synchronously
export {
	Align,
	Direction,
	Display,
	Edge,
	FlexDirection,
	Gutter,
	Justify,
	PositionType,
	Unit,
	Wrap,
	type Yoga,
	type Node as YogaNode,
} from 'yoga-layout/load';

// Re-export types

// Singleton instance management
let yogaInstance: YogaType | undefined;
let isInitialized = false;

// Start loading immediately when module is imported
// This runs in the background and doesn't block
// eslint-disable-next-line unicorn/prefer-top-level-await, promise/prefer-await-to-then
const loadingPromise = loadYoga()
	.then(yoga => {
		yogaInstance = yoga;
		isInitialized = true;
		return yoga;
	})
	.catch((error: unknown) => {
		console.error('Failed to load Yoga layout engine:', error);
		throw error as Error;
	});

/**
 * Get the Yoga instance synchronously.
 * This will work if Yoga has finished loading (which is very fast).
 * If called too early, it throws an error with guidance.
 */
export function getYoga(): YogaType {
	if (!yogaInstance) {
		throw new Error(
			'Yoga layout engine is not yet initialized. ' +
				'This usually means render() was called immediately on module load. ' +
				'Please ensure Yoga is loaded by awaiting initYoga() or adding a small delay.',
		);
	}

	return yogaInstance;
}

/**
 * Try to get the Yoga instance synchronously without throwing.
 * Returns undefined if Yoga is not yet initialized.
 */
export function getYogaIfAvailable(): YogaType | undefined {
	return yogaInstance;
}

/**
 * Initialize Yoga asynchronously.
 * Can be called multiple times safely - subsequent calls return the same promise.
 */
export async function initYoga(): Promise<YogaType> {
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	if (loadingPromise) {
		return loadingPromise;
	}

	// Should never reach here, but handle it gracefully
	if (yogaInstance) {
		return yogaInstance;
	}

	throw new Error('Yoga initialization was not started properly');
}

/**
 * Check if Yoga is initialized.
 * Use this for synchronous checks.
 */
export function isYogaInitialized(): boolean {
	return isInitialized;
}

/**
 * Wait for Yoga to be initialized if not already.
 * This is a utility for synchronous contexts that need to ensure Yoga is ready.
 */
export function ensureYogaInitialized(): void {
	if (!isInitialized) {
		// In practice, this should be extremely rare since loading starts immediately
		// and completes very quickly (typically under 50ms)
		throw new Error(
			'Yoga is still loading. The application tried to use Yoga before it finished initializing. ' +
				'This is likely a timing issue. Consider adding await initYoga() before rendering.',
		);
	}
}

// Export commonly used constants as getters for backward compatibility
// These will access the constants from the loaded Yoga instance
/* eslint-disable @typescript-eslint/naming-convention */
export const DISPLAY_NONE = () => getYoga().DISPLAY_NONE;
export const DISPLAY_FLEX = () => getYoga().DISPLAY_FLEX;
export const EDGE_LEFT = () => getYoga().EDGE_LEFT;
export const EDGE_RIGHT = () => getYoga().EDGE_RIGHT;
export const EDGE_TOP = () => getYoga().EDGE_TOP;
export const EDGE_BOTTOM = () => getYoga().EDGE_BOTTOM;
export const EDGE_START = () => getYoga().EDGE_START;
export const EDGE_END = () => getYoga().EDGE_END;
export const EDGE_HORIZONTAL = () => getYoga().EDGE_HORIZONTAL;
export const EDGE_VERTICAL = () => getYoga().EDGE_VERTICAL;
export const EDGE_ALL = () => getYoga().EDGE_ALL;
export const DIRECTION_LTR = () => getYoga().DIRECTION_LTR;
export const DIRECTION_INHERIT = () => getYoga().DIRECTION_INHERIT;
export const DIRECTION_RTL = () => getYoga().DIRECTION_RTL;
export const POSITION_TYPE_RELATIVE = () => getYoga().POSITION_TYPE_RELATIVE;
export const POSITION_TYPE_ABSOLUTE = () => getYoga().POSITION_TYPE_ABSOLUTE;
export const POSITION_TYPE_STATIC = () => getYoga().POSITION_TYPE_STATIC;
export const ALIGN_AUTO = () => getYoga().ALIGN_AUTO;
export const ALIGN_FLEX_START = () => getYoga().ALIGN_FLEX_START;
export const ALIGN_CENTER = () => getYoga().ALIGN_CENTER;
export const ALIGN_FLEX_END = () => getYoga().ALIGN_FLEX_END;
export const ALIGN_STRETCH = () => getYoga().ALIGN_STRETCH;
export const ALIGN_BASELINE = () => getYoga().ALIGN_BASELINE;
export const ALIGN_SPACE_BETWEEN = () => getYoga().ALIGN_SPACE_BETWEEN;
export const ALIGN_SPACE_AROUND = () => getYoga().ALIGN_SPACE_AROUND;
export const JUSTIFY_FLEX_START = () => getYoga().JUSTIFY_FLEX_START;
export const JUSTIFY_CENTER = () => getYoga().JUSTIFY_CENTER;
export const JUSTIFY_FLEX_END = () => getYoga().JUSTIFY_FLEX_END;
export const JUSTIFY_SPACE_BETWEEN = () => getYoga().JUSTIFY_SPACE_BETWEEN;
export const JUSTIFY_SPACE_AROUND = () => getYoga().JUSTIFY_SPACE_AROUND;
export const JUSTIFY_SPACE_EVENLY = () => getYoga().JUSTIFY_SPACE_EVENLY;
export const FLEX_DIRECTION_ROW = () => getYoga().FLEX_DIRECTION_ROW;
export const FLEX_DIRECTION_ROW_REVERSE = () =>
	getYoga().FLEX_DIRECTION_ROW_REVERSE;
export const FLEX_DIRECTION_COLUMN = () => getYoga().FLEX_DIRECTION_COLUMN;
export const FLEX_DIRECTION_COLUMN_REVERSE = () =>
	getYoga().FLEX_DIRECTION_COLUMN_REVERSE;
export const WRAP_NO_WRAP = () => getYoga().WRAP_NO_WRAP;
export const WRAP_WRAP = () => getYoga().WRAP_WRAP;
export const WRAP_WRAP_REVERSE = () => getYoga().WRAP_WRAP_REVERSE;
export const GUTTER_ALL = () => getYoga().GUTTER_ALL;
export const GUTTER_COLUMN = () => getYoga().GUTTER_COLUMN;
export const GUTTER_ROW = () => getYoga().GUTTER_ROW;
/* eslint-enable @typescript-eslint/naming-convention */
