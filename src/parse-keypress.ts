// Copied from https://github.com/enquirer/enquirer/blob/36785f3399a41cd61e9d28d1eb9c2fcd73d69b4c/lib/keypress.js
import {Buffer} from 'node:buffer';

const metaKeyCodeRe = /^(?:\x1b)([a-zA-Z0-9])$/;

const fnKeyRe =
	/^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

// Kitty keyboard protocol escape sequence pattern
// Format: CSI number ; modifiers u OR CSI number u (without modifiers)
// CSI = \x1b[
const kittyKeyRe = /^\x1b\[(\d+)(?:;(\d+))?u$/;

const keyName: Record<string, string> = {
	/* xterm/gnome ESC O letter */
	OP: 'f1',
	OQ: 'f2',
	OR: 'f3',
	OS: 'f4',
	/* xterm/rxvt ESC [ number ~ */
	'[11~': 'f1',
	'[12~': 'f2',
	'[13~': 'f3',
	'[14~': 'f4',
	/* from Cygwin and used in libuv */
	'[[A': 'f1',
	'[[B': 'f2',
	'[[C': 'f3',
	'[[D': 'f4',
	'[[E': 'f5',
	/* common */
	'[15~': 'f5',
	'[17~': 'f6',
	'[18~': 'f7',
	'[19~': 'f8',
	'[20~': 'f9',
	'[21~': 'f10',
	'[23~': 'f11',
	'[24~': 'f12',
	/* xterm ESC [ letter */
	'[A': 'up',
	'[B': 'down',
	'[C': 'right',
	'[D': 'left',
	'[E': 'clear',
	'[F': 'end',
	'[H': 'home',
	/* xterm/gnome ESC O letter */
	OA: 'up',
	OB: 'down',
	OC: 'right',
	OD: 'left',
	OE: 'clear',
	OF: 'end',
	OH: 'home',
	/* xterm/rxvt ESC [ number ~ */
	'[1~': 'home',
	'[2~': 'insert',
	'[3~': 'delete',
	'[4~': 'end',
	'[5~': 'pageup',
	'[6~': 'pagedown',
	/* putty */
	'[[5~': 'pageup',
	'[[6~': 'pagedown',
	/* rxvt */
	'[7~': 'home',
	'[8~': 'end',
	/* rxvt keys with modifiers */
	'[a': 'up',
	'[b': 'down',
	'[c': 'right',
	'[d': 'left',
	'[e': 'clear',

	'[2$': 'insert',
	'[3$': 'delete',
	'[5$': 'pageup',
	'[6$': 'pagedown',
	'[7$': 'home',
	'[8$': 'end',

	Oa: 'up',
	Ob: 'down',
	Oc: 'right',
	Od: 'left',
	Oe: 'clear',

	'[2^': 'insert',
	'[3^': 'delete',
	'[5^': 'pageup',
	'[6^': 'pagedown',
	'[7^': 'home',
	'[8^': 'end',
	/* misc. */
	'[Z': 'tab',
};

export const nonAlphanumericKeys = [...Object.values(keyName), 'backspace'];

const isShiftKey = (code: string) => {
	return [
		'[a',
		'[b',
		'[c',
		'[d',
		'[e',
		'[2$',
		'[3$',
		'[5$',
		'[6$',
		'[7$',
		'[8$',
		'[Z',
	].includes(code);
};

const isCtrlKey = (code: string) => {
	return [
		'Oa',
		'Ob',
		'Oc',
		'Od',
		'Oe',
		'[2^',
		'[3^',
		'[5^',
		'[6^',
		'[7^',
		'[8^',
	].includes(code);
};

// Kitty keyboard protocol functional key codes
// These are the non-Unicode codepoint key codes used by the protocol
// Reference: https://sw.kovidgoyal.net/kitty/keyboard-protocol/#functional-key-definitions
const kittyFunctionalKeys: Record<number, string> = {
	27: 'escape',
	13: 'return',
	9: 'tab',
	127: 'backspace',
	// Navigation keys (from Kitty protocol spec)
	57358: 'insert',
	57359: 'delete',
	57360: 'home',
	57361: 'end',
	57362: 'pageup',
	57363: 'pagedown',
	// Arrow keys (from Kitty protocol spec)
	57352: 'up',
	57353: 'down',
	57354: 'right',
	57355: 'left',
	// Function keys (from Kitty protocol spec)
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
};

// Parse Kitty keyboard protocol escape sequences
// Returns undefined if not a valid Kitty sequence
const parseKittySequence = (
	s: string,
): {codepoint: number; modifiers: number} | undefined => {
	const match = kittyKeyRe.exec(s);
	if (!match) {
		return undefined;
	}

	const codepoint = Number.parseInt(match[1]!, 10);
	// Modifiers default to 1 (no modifiers) if not present
	const modifiers = match[2] ? Number.parseInt(match[2], 10) : 1;

	return {codepoint, modifiers};
};

// Decode Kitty modifier value into individual flags
// Kitty uses: value = 1 + (shift?1:0) + (alt?2:0) + (ctrl?4:0) + (super?8:0)
const decodeKittyModifiers = (
	modifiers: number,
): {shift: boolean; meta: boolean; ctrl: boolean; option: boolean} => {
	const value = modifiers - 1; // Subtract the base 1
	return {
		shift: !!(value & 1),
		meta: !!(value & 2), // Alt maps to meta
		ctrl: !!(value & 4),
		option: !!(value & 8), // Super maps to option
	};
};

// Get key name from Kitty codepoint
const getKittyKeyName = (codepoint: number): string => {
	// Check if it's a known functional key
	if (kittyFunctionalKeys[codepoint]) {
		return kittyFunctionalKeys[codepoint]!;
	}

	// Otherwise it's a Unicode codepoint - convert to character
	// Handle space specially
	if (codepoint === 32) {
		return 'space';
	}

	// For printable ASCII, return the character as lowercase
	if (codepoint >= 65 && codepoint <= 90) {
		// Uppercase A-Z
		return String.fromCodePoint(codepoint).toLowerCase();
	}

	if (codepoint >= 97 && codepoint <= 122) {
		// Lowercase a-z
		return String.fromCodePoint(codepoint);
	}

	if (codepoint >= 48 && codepoint <= 57) {
		// 0-9
		return 'number';
	}

	// For other codepoints, return the character
	return String.fromCodePoint(codepoint);
};

type ParsedKey = {
	name: string;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
	option: boolean;
	sequence: string;
	raw: string | undefined;
	code?: string;
};

const parseKeypress = (s: Buffer | string = ''): ParsedKey => {
	let parts;

	if (Buffer.isBuffer(s)) {
		if (s[0]! > 127 && s[1] === undefined) {
			(s[0] as unknown as number) -= 128;
			s = '\x1b' + String(s);
		} else {
			s = String(s);
		}
	} else if (s !== undefined && typeof s !== 'string') {
		s = String(s);
	} else if (!s) {
		s = '';
	}

	const key: ParsedKey = {
		name: '',
		ctrl: false,
		meta: false,
		shift: false,
		option: false,
		sequence: s,
		raw: s,
	};

	key.sequence = key.sequence || s || key.name;

	if (s === '\r') {
		// carriage return
		key.raw = undefined;
		key.name = 'return';
	} else if (s === '\n') {
		// enter, should have been called linefeed
		key.name = 'enter';
	} else if (s === '\t') {
		// tab
		key.name = 'tab';
	} else if (s === '\b' || s === '\x1b\b') {
		// backspace or ctrl+h
		key.name = 'backspace';
		key.meta = s.charAt(0) === '\x1b';
	} else if (s === '\x7f' || s === '\x1b\x7f') {
		// TODO(vadimdemedes): `enquirer` detects delete key as backspace, but I had to split them up to avoid breaking changes in Ink. Merge them back together in the next major version.
		// delete
		key.name = 'delete';
		key.meta = s.charAt(0) === '\x1b';
	} else if (s === '\x1b' || s === '\x1b\x1b') {
		// escape key
		key.name = 'escape';
		key.meta = s.length === 2;
	} else if (kittyKeyRe.test(s)) {
		// Kitty keyboard protocol escape sequence
		const kittyResult = parseKittySequence(s);
		if (kittyResult) {
			const {codepoint, modifiers} = kittyResult;
			const modifierFlags = decodeKittyModifiers(modifiers);

			key.name = getKittyKeyName(codepoint);
			key.ctrl = modifierFlags.ctrl;
			key.meta = modifierFlags.meta;
			key.shift = modifierFlags.shift;
			key.option = modifierFlags.option;
			key.code = `kitty:${codepoint}`;
		}
	} else if (s === ' ' || s === '\x1b ') {
		key.name = 'space';
		key.meta = s.length === 2;
	} else if (s.length === 1 && s <= '\x1a') {
		// ctrl+letter
		key.name = String.fromCharCode(s.charCodeAt(0) + 'a'.charCodeAt(0) - 1);
		key.ctrl = true;
	} else if (s.length === 1 && s >= '0' && s <= '9') {
		// number
		key.name = 'number';
	} else if (s.length === 1 && s >= 'a' && s <= 'z') {
		// lowercase letter
		key.name = s;
	} else if (s.length === 1 && s >= 'A' && s <= 'Z') {
		// shift+letter
		key.name = s.toLowerCase();
		key.shift = true;
	} else if ((parts = metaKeyCodeRe.exec(s))) {
		// meta+character key
		key.meta = true;
		key.shift = /^[A-Z]$/.test(parts[1]!);
	} else if ((parts = fnKeyRe.exec(s))) {
		const segs = [...s];

		if (segs[0] === '\u001b' && segs[1] === '\u001b') {
			key.option = true;
		}

		// ansi escape sequence
		// reassemble the key code leaving out leading \x1b's,
		// the modifier key bitflag and any meaningless "1;" sequence
		const code = [parts[1], parts[2], parts[4], parts[6]]
			.filter(Boolean)
			.join('');

		const modifier = ((parts[3] || parts[5] || 1) as number) - 1;

		// Parse the key modifier
		key.ctrl = !!(modifier & 4);
		key.meta = !!(modifier & 10);
		key.shift = !!(modifier & 1);
		key.code = code;

		key.name = keyName[code]!;
		key.shift = isShiftKey(code) || key.shift;
		key.ctrl = isCtrlKey(code) || key.ctrl;
	}

	return key;
};

export default parseKeypress;
