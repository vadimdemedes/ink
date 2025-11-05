import {type DOMElement} from './dom.js';

export type ResizeObserverCallback = (
	entries: ResizeObserverEntry[],
	observer: ResizeObserver,
) => void;

export class ResizeObserverEntry {
	constructor(
		readonly target: DOMElement,
		readonly contentRect: {width: number; height: number},
	) {}
}

export default class ResizeObserver {
	private readonly observedElements = new Set<DOMElement>();

	constructor(private readonly callback: ResizeObserverCallback) {}

	observe(element: DOMElement): void {
		this.observedElements.add(element);
		element.resizeObservers ||= new Set();
		element.resizeObservers.add(this);
	}

	unobserve(element: DOMElement): void {
		this.observedElements.delete(element);
		element.resizeObservers?.delete(this);
	}

	disconnect(): void {
		for (const element of this.observedElements) {
			element.resizeObservers?.delete(this);
		}

		this.observedElements.clear();
	}

	// Internal method called by Ink during layout
	internalTrigger(entries: ResizeObserverEntry[]): void {
		this.callback(entries, this);
	}
}
