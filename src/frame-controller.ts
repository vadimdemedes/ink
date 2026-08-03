import instances from './instances.js';

/**
A selection region in the composited frame. Coordinates are zero-based cell
positions and are always stored in reading order: `(sx, sy)` is the
first selected cell and `(ex, ey)` the last one, so reverse (right-to-left or
bottom-to-top) drags select the same region as forward drags.
*/
export type ScreenSelection = {
	readonly sx: number;
	readonly sy: number;
	readonly ex: number;
	readonly ey: number;
};

/**
A single cell of the composited frame. Wide characters (e.g. CJK) occupy two
cells: the leading cell has `fullWidth` set to `true` and carries the
character, while the trailing placeholder cell has an empty `value`. Skip
cells with an empty `value` when extracting text.

`selectable` reflects the selection semantics of the `<Text>` the cell
originated from (and is `false` for non-text content such as box
backgrounds). Cells of one selection flow share the same numeric `flowId`,
which is stable for the duration of a single render.
*/
export type FrameCell = {
	readonly value: string;
	readonly fullWidth: boolean;
	readonly selectable: boolean;
	readonly flowId: number | undefined;
};

/**
How two adjacent regions of text join when copied. `'soft'` boundaries come
from wrapping (the `joiner` is the whitespace the wrap consumed, possibly
empty) or an explicit `selectionBreakAfter="soft"`; `'hard'` boundaries come
from source newlines or `selectionBreakAfter="hard"` and join with `\n`
unless a custom `joiner` was given.
*/
export type FrameBoundary = {
	readonly kind: 'soft' | 'hard';
	readonly joiner: string;
};

/**
A read-only snapshot of the composited frame. `cells[y][x]` is the cell at
column `x` of row `y`, with `(0, 0)` at the top-left of Ink's output region.
`boundaries[y][x]` is the boundary immediately after that cell, if any.
*/
export type ReadonlyFrame = {
	readonly width: number;
	readonly height: number;
	readonly cells: ReadonlyArray<readonly FrameCell[]>;
	readonly boundaries: ReadonlyArray<ReadonlyArray<FrameBoundary | undefined>>;
};

/**
Bridge between an application that owns its input (for example an
alternate-screen app handling mouse events itself) and the renderer: the app
subscribes to composited frames and pushes a selection, which Ink highlights
before serialization.

Frames are only generated while at least one subscriber is registered, so
apps that never subscribe pay no overhead. Listeners are notified outside of
the render pass and notifications are coalesced, so a listener cannot
re-enter rendering or observe frames out of order.
*/
export type FrameController = {
	/**
	Returns the latest composited frame, or `undefined` when no frame has been
	published yet. Frames are only generated while subscribers are registered.
	*/
	getFrame(): ReadonlyFrame | undefined;

	/**
	Returns the current selection in reading order, or `undefined` when there
	is none.
	*/
	getSelection(): ScreenSelection | undefined;

	/**
	Highlights the given selection region (or clears it with `undefined`) and
	schedules a repaint through Ink's regular render throttle. Reverse
	selections are normalized to reading order. Setting an identical selection
	is a no-op. Non-selectable cells inside the region are not highlighted,
	matching what a copy would include.
	*/
	setSelection(selection: ScreenSelection | undefined): void;

	/**
	Subscribes to composited frames. Schedules a render so the listener
	receives the current frame even when nothing else triggers one. Returns an
	unsubscribe function.
	*/
	subscribe(listener: (frame: ReadonlyFrame) => void): () => void;
};

type FrameListener = (frame: ReadonlyFrame) => void;

export type InternalFrameController = FrameController & {
	/**
	Whether frames should be generated on the next render.
	*/
	hasSubscribers(): boolean;

	/**
	Publishes the composited cells and boundaries of the frame that was just
	rendered.
	*/
	publishFrame(
		cells: ReadonlyArray<readonly FrameCell[]>,
		boundaries: ReadonlyArray<ReadonlyArray<FrameBoundary | undefined>>,
	): void;
};

// Normalizes the selection to reading order so reverse drags select the same
// region as forward drags.
const normalizeSelection = (selection: ScreenSelection): ScreenSelection => {
	let {sx, sy, ex, ey} = selection;

	if (sy > ey || (sy === ey && sx > ex)) {
		[sx, ex] = [ex, sx];
		[sy, ey] = [ey, sy];
	}

	return {sx, sy, ex, ey};
};

const sameSelection = (
	a: ScreenSelection | undefined,
	b: ScreenSelection | undefined,
): boolean => {
	if (a === b) {
		return true;
	}

	if (!a || !b) {
		return false;
	}

	return a.sx === b.sx && a.sy === b.sy && a.ex === b.ex && a.ey === b.ey;
};

export const createFrameController = (
	requestRender: () => void,
): InternalFrameController => {
	let currentSelection: ScreenSelection | undefined;
	let lastFrame: ReadonlyFrame | undefined;
	const listeners = new Set<FrameListener>();
	let notificationScheduled = false;

	// Runs in a microtask, after the render that published the frame has fully
	// completed. A listener calling setSelection() from here schedules a new
	// render instead of re-entering the one in flight.
	const notifyListeners = () => {
		notificationScheduled = false;

		const frame = lastFrame;

		if (!frame) {
			return;
		}

		// Iterating the live set is safe here: listeners removed during
		// notification are skipped, and setSelection() calls from a listener
		// only schedule a new render.
		for (const listener of listeners) {
			listener(frame);
		}
	};

	return {
		getFrame: () => lastFrame,
		getSelection: () => currentSelection,
		setSelection(selection) {
			const normalized = selection ? normalizeSelection(selection) : undefined;

			if (sameSelection(currentSelection, normalized)) {
				return;
			}

			currentSelection = normalized;
			requestRender();
		},
		subscribe(listener) {
			listeners.add(listener);

			// Deliver the current frame even if nothing else triggers a render.
			requestRender();

			return () => {
				listeners.delete(listener);
			};
		},
		hasSubscribers: () => listeners.size > 0,
		publishFrame(cells, boundaries) {
			let width = 0;

			for (const row of cells) {
				width = Math.max(width, row.length);
			}

			const frame: ReadonlyFrame = {
				width,
				height: cells.length,
				cells,
				boundaries,
			};

			for (const row of cells) {
				Object.freeze(row);
			}

			for (const row of boundaries) {
				Object.freeze(row);
			}

			Object.freeze(frame);
			lastFrame = frame;

			if (listeners.size > 0 && !notificationScheduled) {
				notificationScheduled = true;
				queueMicrotask(notifyListeners);
			}
		},
	};
};

/**
Returns the frame controller of the Ink instance rendering to `stdout`, or
`undefined` when there is none.
*/
export const getFrameController = (
	stdout: NodeJS.WriteStream,
): FrameController | undefined => instances.get(stdout)?.frameController;
