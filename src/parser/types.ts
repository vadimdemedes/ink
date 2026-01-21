export type EmitMetadata = {
	readonly isPaste?: boolean;
};

/**
 * Stateful parser that turns input chunks into individual keypresses.
 *
 * It keeps enough context to join split escape sequences, including bracketed
 * paste markers and the single-ESC ambiguity.
 */
export type KeypressParser = {
	push: (chunk: string) => void;
	reset: () => void;
};

export type GraphemeInfo = {
	readonly segment: string;
	readonly length: number;
};

export type EscapeParseResult =
	| {readonly kind: 'complete'; readonly length: number}
	| {readonly kind: 'incomplete'; readonly length: number}
	| {readonly kind: 'invalid'; readonly length: number};
