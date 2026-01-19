/**
 * Kitty keyboard protocol support for Ink
 *
 * This module provides parsing and constants for the Kitty keyboard protocol,
 * which enables better key detection including modifier keys and event types.
 *
 * Protocol reference: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */

// ESC character (U+001B)
const esc = '\u001B';

// Protocol escape sequences
export const kittyQuery = `${esc}[?u`; // Query terminal support
export const kittyEnable = `${esc}[>1u`; // Enable disambiguate mode (level 1)
export const kittyDisable = `${esc}[<u`; // Restore original mode

// Enhancement level flags (bitfield for opt-in features)
export const kittyFlags = {
	disambiguate: 0b0001, // Level 1: Disambiguate escape codes
	eventTypes: 0b0010, // Level 2: Report key events (press/repeat/release)
	alternateKeys: 0b0100, // Level 4: Report alternate keys
	allKeys: 0b1000, // Level 8: Report all keys as escape codes
} as const;

// Modifier key bitfield values (as sent in the protocol, -1 from actual value)
export const kittyModifiers = {
	shift: 1,
	alt: 2,
	ctrl: 4,
	super: 8,
} as const;

// Event types in the Kitty protocol
export type KittyEventType = 'press' | 'repeat' | 'release';

// Parsed Kitty keypress structure
export type KittyKeypress = {
	codepoint: number;
	modifiers: {
		shift: boolean;
		alt: boolean;
		ctrl: boolean;
		super: boolean;
	};
	eventType: KittyEventType;
};

/**
 * Regex to match Kitty keyboard protocol sequences.
 *
 * Format: CSI codepoint [; modifiers [:event-type]] u
 * - CSI is ESC [
 * - codepoint is a decimal number (Unicode codepoint)
 * - modifiers is optional, a decimal number (bitfield + 1)
 * - event-type is optional, after a colon: 1=press, 2=repeat, 3=release
 * - u terminates the sequence
 *
 * Examples:
 * - ESC[97u       -> 'a' with no modifiers
 * - ESC[97;2u     -> shift+a
 * - ESC[97;5u     -> ctrl+a
 * - ESC[97;5:1u   -> ctrl+a press event
 */
// eslint-disable-next-line no-control-regex
const kittySequenceRegex = /^\u001B\[(\d+)(?:;(\d+)(?::(\d+))?)?u$/;

// CSI prefix for quick detection
const csiPrefix = `${esc}[`;

/**
 * Quick check if data might be a Kitty keyboard sequence.
 * This is faster than full parsing for filtering.
 */
export function isKittySequence(data: string): boolean {
	// Quick sanity checks before regex
	if (data.length < 4) {
		return false;
	}

	if (!data.startsWith(csiPrefix)) {
		return false;
	}

	if (!data.endsWith('u')) {
		return false;
	}

	return kittySequenceRegex.test(data);
}

/**
 * Decode modifier bitfield into individual boolean flags.
 *
 * The protocol sends (modifier_sum + 1), where modifier_sum is:
 * - shift: 1
 * - alt: 2
 * - ctrl: 4
 * - super: 8
 *
 * So if no modifiers, the value is 1. With shift+ctrl, it's 1+4+1=6.
 */
export function decodeModifiers(bitfield: number): {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	super: boolean;
} {
	// Subtract 1 to get the actual modifier bits
	const bits = bitfield - 1;

	return {
		shift: hasFlag(bits, kittyModifiers.shift),
		alt: hasFlag(bits, kittyModifiers.alt),
		ctrl: hasFlag(bits, kittyModifiers.ctrl),
		super: hasFlag(bits, kittyModifiers.super),
	};
}

/**
 * Check if a bitfield has a specific flag set.
 */
function hasFlag(bits: number, flag: number): boolean {
	// eslint-disable-next-line no-bitwise
	return (bits & flag) !== 0;
}

/**
 * Parse a Kitty keyboard protocol sequence into structured data.
 *
 * Returns undefined if the input is not a valid Kitty sequence.
 */
export function parseKittySequence(data: string): KittyKeypress | undefined {
	const match = kittySequenceRegex.exec(data);

	if (!match) {
		return undefined;
	}

	const codepoint = Number.parseInt(match[1]!, 10);
	const modifierValue = match[2] ? Number.parseInt(match[2], 10) : 1;
	const eventTypeValue = match[3] ? Number.parseInt(match[3], 10) : 1;

	// Decode event type
	let eventType: KittyEventType;
	switch (eventTypeValue) {
		case 2: {
			eventType = 'repeat';
			break;
		}

		case 3: {
			eventType = 'release';
			break;
		}

		default: {
			eventType = 'press';
		}
	}

	return {
		codepoint,
		modifiers: decodeModifiers(modifierValue),
		eventType,
	};
}
