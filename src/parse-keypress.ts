// Copied from https://github.com/enquirer/enquirer/blob/36785f3399a41cd61e9d28d1eb9c2fcd73d69b4c/lib/keypress.js
import {Buffer} from 'node:buffer';
import {kittyModifiers} from './kitty-keyboard.js';

const metaKeyCodeRe = /^(?:\x1b)([a-zA-Z0-9])$/;

const fnKeyRe =
	/^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z]))/;

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

type ParsedKey = {
	name: string;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
	option: boolean;
	sequence: string;
	raw: string | undefined;
	code?: string;
	super?: boolean;
	hyper?: boolean;
	capsLock?: boolean;
	numLock?: boolean;
	eventType?: 'press' | 'repeat' | 'release';
	isKittyProtocol?: boolean;
	text?: string;
	// Whether this key represents printable text input.
	// When false, the key is a control/function/modifier key that should not
	// produce text input (e.g., arrows, function keys, capslock, media keys).
	// Only set by the kitty protocol parser.
	isPrintable?: boolean;
};

// Kitty keyboard protocol: CSI codepoint ; modifiers [: eventType] [; text-as-codepoints] u
const kittyKeyRe = /^\x1b\[(\d+)(?:;(\d+)(?::(\d+))?(?:;([\d:]+))?)?u$/;

// Kitty-enhanced special keys: CSI number ; modifiers : eventType {letter|~}
// These are legacy CSI sequences enhanced with the :eventType field.
// Examples: \x1b[1;1:1A (up arrow press), \x1b[3;1:3~ (delete release)
const kittySpecialKeyRe = /^\x1b\[(\d+);(\d+):(\d+)([A-Za-z~])$/;

// Letter-terminated special key names (CSI 1 ; mods letter)
const kittySpecialLetterKeys: Record<string, string> = {
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

// Number-terminated special key names (CSI number ; mods ~)
const kittySpecialNumberKeys: Record<number, string> = {
	2: 'insert',
	3: 'delete',
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

// Map of special codepoints to key names in kitty protocol
const kittyCodepointNames: Record<number, string> = {
	27: 'escape',
	// 13 (return) and 32 (space) are handled before this lookup
	// in parseKittyKeypress so they can be marked as printable.
	9: 'tab',
	127: 'delete',
	8: 'backspace',
	57358: 'capslock',
	57359: 'scrolllock',
	57360: 'numlock',
	57361: 'printscreen',
	57362: 'pause',
	57363: 'menu',
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
	57399: 'kp0',
	57400: 'kp1',
	57401: 'kp2',
	57402: 'kp3',
	57403: 'kp4',
	57404: 'kp5',
	57405: 'kp6',
	57406: 'kp7',
	57407: 'kp8',
	57408: 'kp9',
	57409: 'kpdecimal',
	57410: 'kpdivide',
	57411: 'kpmultiply',
	57412: 'kpsubtract',
	57413: 'kpadd',
	57414: 'kpenter',
	57415: 'kpequal',
	57416: 'kpseparator',
	57417: 'kpleft',
	57418: 'kpright',
	57419: 'kpup',
	57420: 'kpdown',
	57421: 'kppageup',
	57422: 'kppagedown',
	57423: 'kphome',
	57424: 'kpend',
	57425: 'kpinsert',
	57426: 'kpdelete',
	57427: 'kpbegin',
	57428: 'mediaplay',
	57429: 'mediapause',
	57430: 'mediaplaypause',
	57431: 'mediareverse',
	57432: 'mediastop',
	57433: 'mediafastforward',
	57434: 'mediarewind',
	57435: 'mediatracknext',
	57436: 'mediatrackprevious',
	57437: 'mediarecord',
	57438: 'lowervolume',
	57439: 'raisevolume',
	57440: 'mutevolume',
	57441: 'leftshift',
	57442: 'leftcontrol',
	57443: 'leftalt',
	57444: 'leftsuper',
	57445: 'lefthyper',
	57446: 'leftmeta',
	57447: 'rightshift',
	57448: 'rightcontrol',
	57449: 'rightalt',
	57450: 'rightsuper',
	57451: 'righthyper',
	57452: 'rightmeta',
	57453: 'isoLevel3Shift',
	57454: 'isoLevel5Shift',
};

// Valid Unicode codepoint range, excluding surrogates
const isValidCodepoint = (cp: number): boolean =>
	cp >= 0 && cp <= 0x10_ffff && !(cp >= 0xd8_00 && cp <= 0xdf_ff);

const safeFromCodePoint = (cp: number): string =>
	isValidCodepoint(cp) ? String.fromCodePoint(cp) : '?';

type EventType = 'press' | 'repeat' | 'release';

function resolveEventType(value: number): EventType {
	if (value === 3) return 'release';
	if (value === 2) return 'repeat';
	return 'press';
}

function parseKittyModifiers(
	modifiers: number,
): Pick<
	ParsedKey,
	| 'ctrl'
	| 'shift'
	| 'meta'
	| 'option'
	| 'super'
	| 'hyper'
	| 'capsLock'
	| 'numLock'
> {
	return {
		ctrl: !!(modifiers & kittyModifiers.ctrl),
		shift: !!(modifiers & kittyModifiers.shift),
		meta: !!(modifiers & kittyModifiers.meta),
		option: !!(modifiers & kittyModifiers.alt),
		super: !!(modifiers & kittyModifiers.super),
		hyper: !!(modifiers & kittyModifiers.hyper),
		capsLock: !!(modifiers & kittyModifiers.capsLock),
		numLock: !!(modifiers & kittyModifiers.numLock),
	};
}

const parseKittyKeypress = (s: string): ParsedKey | null => {
	const match = kittyKeyRe.exec(s);
	if (!match) return null;

	const codepoint = parseInt(match[1]!, 10);
	const modifiers = match[2] ? Math.max(0, parseInt(match[2], 10) - 1) : 0;
	const eventType = match[3] ? parseInt(match[3], 10) : 1;
	const textField = match[4];

	// Bail on invalid primary codepoint
	if (!isValidCodepoint(codepoint)) {
		return null;
	}

	// Parse text-as-codepoints field (colon-separated Unicode codepoints)
	let text: string | undefined;
	if (textField) {
		text = textField
			.split(':')
			.map(cp => safeFromCodePoint(parseInt(cp, 10)))
			.join('');
	}

	// Determine key name from codepoint
	let name: string;
	let isPrintable: boolean;
	if (codepoint === 32) {
		name = 'space';
		isPrintable = true;
	} else if (codepoint === 13) {
		name = 'return';
		isPrintable = true;
	} else if (kittyCodepointNames[codepoint]) {
		name = kittyCodepointNames[codepoint]!;
		isPrintable = false;
	} else if (codepoint >= 1 && codepoint <= 26) {
		// Ctrl+letter comes as codepoint 1-26
		name = String.fromCodePoint(codepoint + 96); // 'a' is 97
		isPrintable = false;
	} else {
		name = safeFromCodePoint(codepoint).toLowerCase();
		isPrintable = true;
	}

	// Default text to the character from the codepoint when not explicitly
	// provided by the protocol, so keys like space and return produce their
	// expected text input (' ' and '\r' respectively).
	if (isPrintable && !text) {
		text = safeFromCodePoint(codepoint);
	}

	return {
		name,
		...parseKittyModifiers(modifiers),
		eventType: resolveEventType(eventType),
		sequence: s,
		raw: s,
		isKittyProtocol: true,
		isPrintable,
		text,
	};
};

// Parse kitty-enhanced special key sequences (arrow keys, function keys, etc.)
// These use the legacy CSI format but with an added :eventType field.
const parseKittySpecialKey = (s: string): ParsedKey | null => {
	const match = kittySpecialKeyRe.exec(s);
	if (!match) return null;

	const number = parseInt(match[1]!, 10);
	const modifiers = Math.max(0, parseInt(match[2]!, 10) - 1);
	const eventType = parseInt(match[3]!, 10);
	const terminator = match[4]!;

	const name =
		terminator === '~'
			? kittySpecialNumberKeys[number]
			: kittySpecialLetterKeys[terminator];

	if (!name) return null;

	return {
		name,
		...parseKittyModifiers(modifiers),
		eventType: resolveEventType(eventType),
		sequence: s,
		raw: s,
		isKittyProtocol: true,
		isPrintable: false,
	};
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

	// Try kitty keyboard protocol parsers first
	const kittyResult = parseKittyKeypress(s);
	if (kittyResult) return kittyResult;

	const kittySpecialResult = parseKittySpecialKey(s);
	if (kittySpecialResult) return kittySpecialResult;

	// If the input matched the kitty CSI-u pattern but was rejected (e.g.,
	// invalid codepoint), return a safe empty keypress instead of falling
	// through to legacy parsing which can produce unsafe states (undefined name)
	if (kittyKeyRe.test(s)) {
		return {
			name: '',
			ctrl: false,
			meta: false,
			shift: false,
			option: false,
			sequence: s,
			raw: s,
			isKittyProtocol: true,
			isPrintable: false,
		};
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

	if (s === '\r' || s === '\x1b\r') {
		// carriage return (or option+return on macOS)
		key.raw = undefined;
		key.name = 'return';
		key.option = s.length === 2;
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
