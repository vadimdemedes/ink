/**
 * Kitty Keyboard Protocol support for Ink
 *
 * This module implements parsing and handling of the Kitty keyboard protocol,
 * which provides enhanced keyboard input detection including:
 * - Reliable modifier key detection (Shift, Ctrl, Alt, Super, Hyper, Meta)
 * - Disambiguation of keys like Ctrl+I vs Tab, Shift+Enter vs Enter
 * - Support for key event types (press, repeat, release)
 *
 * Protocol spec: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */

/**
 * Modifier bitfield values as defined by the Kitty keyboard protocol.
 * These are the raw bit values; the protocol sends (1 + modifiers).
 */
export const KittyModifiers = {
	shift: 0b1,
	alt: 0b10,
	ctrl: 0b100,
	super: 0b1000,
	hyper: 0b10000,
	meta: 0b100000,
	capsLock: 0b1000000,
	numLock: 0b10000000,
} as const;

/**
 * Progressive enhancement flags for the Kitty keyboard protocol.
 */
export const KittyFlags = {
	/**
	 * Disambiguate escape codes - makes keys like Ctrl+I distinguishable from Tab
	 */
	disambiguateEscapeCodes: 0b1,
	/**
	 * Report key event types (press=1, repeat=2, release=3)
	 */
	reportEventTypes: 0b10,
	/**
	 * Report alternate keys (shifted and base layout variants)
	 */
	reportAlternateKeys: 0b100,
	/**
	 * Report all keys as escape codes (not just special ones)
	 */
	reportAllKeysAsEscapeCodes: 0b1000,
	/**
	 * Report associated text as codepoints
	 */
	reportAssociatedText: 0b10000,
} as const;

/**
 * Functional key codes from the Unicode Private Use Area
 * as defined by the Kitty keyboard protocol.
 */
export const KittyFunctionalKeys: Record<number, string> = {
	// Standard ASCII control codes used as key identifiers
	27: 'escape',
	13: 'return',
	9: 'tab',
	127: 'backspace',

	// Navigation keys
	57344: 'escape', // ESCAPE alternate
	57345: 'enter', // ENTER alternate (KP_ENTER uses different code)
	57346: 'tab', // TAB alternate
	57347: 'backspace', // BACKSPACE alternate
	57348: 'insert',
	57349: 'delete',
	57350: 'left',
	57351: 'right',
	57352: 'up',
	57353: 'down',
	57354: 'pageup',
	57355: 'pagedown',
	57356: 'home',
	57357: 'end',
	57358: 'capslock',
	57359: 'scrolllock',
	57360: 'numlock',
	57361: 'printscreen',
	57362: 'pause',
	57363: 'menu',

	// Function keys F1-F35
	57364: 'f1',
	57365: 'f2',
	57366: 'f3',
	57367: 'f4',
	57368: 'f5',
	57369: 'f6',
	57370: 'f7',
	57371: 'f8',
	57372: 'f9',
	57373: 'f10',
	57374: 'f11',
	57375: 'f12',
	57376: 'f13',
	57377: 'f14',
	57378: 'f15',
	57379: 'f16',
	57380: 'f17',
	57381: 'f18',
	57382: 'f19',
	57383: 'f20',
	57384: 'f21',
	57385: 'f22',
	57386: 'f23',
	57387: 'f24',
	57388: 'f25',
	57389: 'f26',
	57390: 'f27',
	57391: 'f28',
	57392: 'f29',
	57393: 'f30',
	57394: 'f31',
	57395: 'f32',
	57396: 'f33',
	57397: 'f34',
	57398: 'f35',

	// Keypad keys
	57399: 'kp_0',
	57400: 'kp_1',
	57401: 'kp_2',
	57402: 'kp_3',
	57403: 'kp_4',
	57404: 'kp_5',
	57405: 'kp_6',
	57406: 'kp_7',
	57407: 'kp_8',
	57408: 'kp_9',
	57409: 'kp_decimal',
	57410: 'kp_divide',
	57411: 'kp_multiply',
	57412: 'kp_subtract',
	57413: 'kp_add',
	57414: 'kp_enter',
	57415: 'kp_equal',
	57416: 'kp_separator',
	57417: 'kp_left',
	57418: 'kp_right',
	57419: 'kp_up',
	57420: 'kp_down',
	57421: 'kp_pageup',
	57422: 'kp_pagedown',
	57423: 'kp_home',
	57424: 'kp_end',
	57425: 'kp_insert',
	57426: 'kp_delete',
	57427: 'kp_begin',

	// Media keys
	57428: 'media_play',
	57429: 'media_pause',
	57430: 'media_play_pause',
	57431: 'media_reverse',
	57432: 'media_stop',
	57433: 'media_fast_forward',
	57434: 'media_rewind',
	57435: 'media_track_next',
	57436: 'media_track_previous',
	57437: 'media_record',
	57438: 'lower_volume',
	57439: 'raise_volume',
	57440: 'mute_volume',

	// Modifier keys (when reported as key events)
	57441: 'left_shift',
	57442: 'left_control',
	57443: 'left_alt',
	57444: 'left_super',
	57445: 'left_hyper',
	57446: 'left_meta',
	57447: 'right_shift',
	57448: 'right_control',
	57449: 'right_alt',
	57450: 'right_super',
	57451: 'right_hyper',
	57452: 'right_meta',
	57453: 'iso_level3_shift',
	57454: 'iso_level5_shift',
};

/**
 * Event types for key events in the Kitty keyboard protocol.
 */
export type KittyEventType = 'press' | 'repeat' | 'release';

/**
 * Parsed result from a Kitty keyboard protocol escape sequence.
 */
export type KittyKeypress = {
	/**
	 * The key name (e.g., 'return', 'tab', 'a', 'f1')
	 */
	name: string;
	/**
	 * The Unicode codepoint of the key
	 */
	codepoint: number;
	/**
	 * Whether the Shift modifier was held
	 */
	shift: boolean;
	/**
	 * Whether the Alt (Option on macOS) modifier was held
	 */
	alt: boolean;
	/**
	 * Whether the Ctrl modifier was held
	 */
	ctrl: boolean;
	/**
	 * Whether the Super (Windows/Command) modifier was held
	 */
	super: boolean;
	/**
	 * Whether the Hyper modifier was held
	 */
	hyper: boolean;
	/**
	 * Whether the Meta modifier was held
	 */
	meta: boolean;
	/**
	 * Whether Caps Lock was active
	 */
	capsLock: boolean;
	/**
	 * Whether Num Lock was active
	 */
	numLock: boolean;
	/**
	 * The type of key event (press, repeat, or release)
	 */
	eventType: KittyEventType;
	/**
	 * The original escape sequence
	 */
	sequence: string;
	/**
	 * Whether this keypress was parsed from a Kitty protocol sequence
	 */
	isKittyProtocol: true;
};

/**
 * Regex to match Kitty keyboard protocol CSI u sequences.
 *
 * Format: CSI unicode-key-code:alternate-keys ; modifiers:event-type ; text-as-codepoints u
 *
 * Examples:
 * - \x1b[97u - 'a' key with no modifiers
 * - \x1b[97;2u - 'a' key with shift
 * - \x1b[13;2u - Enter key with shift (Shift+Enter)
 * - \x1b[9;5u - Tab key with ctrl (Ctrl+Tab, distinguishable from Ctrl+I)
 */
const kittySequenceRegex =
	/^\x1b\[(\d+)(?::[\d:]*)?(?:;(\d+)(?::(\d+))?)?(?:;[\d:]*)?u$/;

/**
 * Regex to match Kitty keyboard protocol CSI ~ sequences for functional keys.
 *
 * Format: CSI number ; modifiers ~
 *
 * Examples:
 * - \x1b[3~    - Delete key
 * - \x1b[3;2~  - Shift+Delete
 * - \x1b[5~    - Page Up
 */
const kittyTildeSequenceRegex = /^\x1b\[(\d+)(?:;(\d+))?~$/;

/**
 * Regex to match Kitty keyboard protocol letter-terminated sequences.
 *
 * Format: CSI 1 ; modifiers [ABCDEFHPQRS]
 *
 * Examples:
 * - \x1b[1;2A  - Shift+Up
 * - \x1b[1;5C  - Ctrl+Right
 */
const kittyLetterSequenceRegex = /^\x1b\[1;(\d+)([ABCDEFHPQRS])$/;

/**
 * Letter code to key name mapping for letter-terminated sequences.
 */
const letterKeyNames: Record<string, string> = {
	A: 'up',
	B: 'down',
	C: 'right',
	D: 'left',
	E: 'clear',
	F: 'end',
	H: 'home',
	P: 'f1',
	Q: 'f2',
	R: 'f3',
	S: 'f4',
};

/**
 * Tilde code to key name mapping.
 */
const tildeKeyNames: Record<number, string> = {
	1: 'home',
	2: 'insert',
	3: 'delete',
	4: 'end',
	5: 'pageup',
	6: 'pagedown',
	7: 'home',
	8: 'end',
	11: 'f1',
	12: 'f2',
	13: 'f3',
	14: 'f4',
	15: 'f5',
	17: 'f6',
	18: 'f7',
	19: 'f8',
	20: 'f9',
	21: 'f10',
	23: 'f11',
	24: 'f12',
};

/**
 * Parse modifiers from the Kitty keyboard protocol modifier field.
 *
 * The modifier field is encoded as (1 + sum of modifier bits).
 */
function parseModifiers(modifierValue: number): {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	super: boolean;
	hyper: boolean;
	meta: boolean;
	capsLock: boolean;
	numLock: boolean;
} {
	// Subtract 1 to get the actual modifier bitfield
	const modifiers = modifierValue - 1;

	return {
		shift: !!(modifiers & KittyModifiers.shift),
		alt: !!(modifiers & KittyModifiers.alt),
		ctrl: !!(modifiers & KittyModifiers.ctrl),
		super: !!(modifiers & KittyModifiers.super),
		hyper: !!(modifiers & KittyModifiers.hyper),
		meta: !!(modifiers & KittyModifiers.meta),
		capsLock: !!(modifiers & KittyModifiers.capsLock),
		numLock: !!(modifiers & KittyModifiers.numLock),
	};
}

/**
 * Parse event type from the Kitty keyboard protocol event type field.
 */
function parseEventType(eventTypeValue: number | undefined): KittyEventType {
	switch (eventTypeValue) {
		case 2:
			return 'repeat';
		case 3:
			return 'release';
		default:
			return 'press';
	}
}

/**
 * Get the key name from a Unicode codepoint.
 */
function getKeyName(codepoint: number): string {
	// Check if it's a known functional key
	const functionalKey = KittyFunctionalKeys[codepoint];
	if (functionalKey) {
		return functionalKey;
	}

	// For regular characters, return the character itself (lowercase)
	if (codepoint >= 32 && codepoint <= 126) {
		return String.fromCodePoint(codepoint).toLowerCase();
	}

	// For control characters, map to their letter equivalent
	if (codepoint >= 1 && codepoint <= 26) {
		return String.fromCharCode(codepoint + 96); // 1 -> 'a', 2 -> 'b', etc.
	}

	// Unknown key, return the codepoint as a string
	return `u${codepoint}`;
}

/**
 * Check if a string is a Kitty keyboard protocol escape sequence.
 */
export function isKittySequence(input: string): boolean {
	return (
		kittySequenceRegex.test(input) ||
		kittyTildeSequenceRegex.test(input) ||
		kittyLetterSequenceRegex.test(input)
	);
}

/**
 * Parse a Kitty keyboard protocol escape sequence.
 *
 * @param input The input string to parse
 * @returns The parsed keypress, or null if not a valid Kitty sequence
 */
export function parseKittySequence(input: string): KittyKeypress | null {
	// Try CSI u format first
	let match = kittySequenceRegex.exec(input);
	if (match) {
		const codepoint = parseInt(match[1]!, 10);
		const modifierValue = match[2] ? parseInt(match[2], 10) : 1;
		const eventTypeValue = match[3] ? parseInt(match[3], 10) : undefined;

		const modifiers = parseModifiers(modifierValue);
		const eventType = parseEventType(eventTypeValue);
		const name = getKeyName(codepoint);

		return {
			name,
			codepoint,
			...modifiers,
			eventType,
			sequence: input,
			isKittyProtocol: true,
		};
	}

	// Try CSI ~ format for functional keys
	match = kittyTildeSequenceRegex.exec(input);
	if (match) {
		const keyCode = parseInt(match[1]!, 10);
		const modifierValue = match[2] ? parseInt(match[2], 10) : 1;

		const modifiers = parseModifiers(modifierValue);
		const name = tildeKeyNames[keyCode] || `f${keyCode}`;

		return {
			name,
			codepoint: keyCode,
			...modifiers,
			eventType: 'press',
			sequence: input,
			isKittyProtocol: true,
		};
	}

	// Try letter-terminated format
	match = kittyLetterSequenceRegex.exec(input);
	if (match) {
		const modifierValue = parseInt(match[1]!, 10);
		const letter = match[2]!;

		const modifiers = parseModifiers(modifierValue);
		const name = letterKeyNames[letter] || letter.toLowerCase();

		return {
			name,
			codepoint: letter.charCodeAt(0),
			...modifiers,
			eventType: 'press',
			sequence: input,
			isKittyProtocol: true,
		};
	}

	return null;
}

/**
 * Generate the escape sequence to enable the Kitty keyboard protocol.
 *
 * @param flags The enhancement flags to enable (default: disambiguate escape codes only)
 * @returns The escape sequence to send to the terminal
 */
export function enableKittyProtocol(
	flags: number = KittyFlags.disambiguateEscapeCodes,
): string {
	// CSI > flags u - Push flags onto the stack
	return `\x1b[>${flags}u`;
}

/**
 * Generate the escape sequence to disable the Kitty keyboard protocol.
 *
 * @returns The escape sequence to send to the terminal
 */
export function disableKittyProtocol(): string {
	// CSI < u - Pop flags from the stack
	return `\x1b[<u`;
}

/**
 * Generate the escape sequence to query Kitty keyboard protocol support.
 *
 * @returns The escape sequence to send to the terminal
 */
export function queryKittyProtocol(): string {
	// CSI ? u - Query current flags
	return `\x1b[?u`;
}

/**
 * Regex to match the Kitty protocol query response.
 *
 * Format: CSI ? flags u
 */
const kittyQueryResponseRegex = /^\x1b\[\?(\d+)u$/;

/**
 * Check if a string is a Kitty protocol query response.
 */
export function isKittyQueryResponse(input: string): boolean {
	return kittyQueryResponseRegex.test(input);
}

/**
 * Parse a Kitty protocol query response to get the current flags.
 *
 * @param input The response string
 * @returns The current flags, or null if not a valid response
 */
export function parseKittyQueryResponse(input: string): number | null {
	const match = kittyQueryResponseRegex.exec(input);
	if (match) {
		return parseInt(match[1]!, 10);
	}
	return null;
}
