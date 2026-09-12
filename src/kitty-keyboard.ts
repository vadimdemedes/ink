// Kitty keyboard protocol flags.
// @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
export const kittyFlags = {
	disambiguateEscapeCodes: 1,
	reportEventTypes: 2,
	reportAlternateKeys: 4,
	reportAllKeysAsEscapeCodes: 8,
	reportAssociatedText: 16,
} as const;

// Valid flag names for the kitty keyboard protocol.
export type KittyFlagName = keyof typeof kittyFlags;

// Converts an array of flag names to the corresponding bitmask value.
export function resolveFlags(flags: KittyFlagName[]): number {
	let result = 0;
	for (const flag of flags) {
		// eslint-disable-next-line no-bitwise
		result |= kittyFlags[flag];
	}

	if (flags.includes('reportAssociatedText')) {
		// Associated text is defined only when all-key reporting is enabled.
		// eslint-disable-next-line no-bitwise
		result |= kittyFlags.reportAllKeysAsEscapeCodes;
	}

	return result;
}

// Kitty keyboard modifier bits.
// These are used in the modifier parameter of CSI u sequences.
// Note: The actual modifier value is (modifiers - 1) as per the protocol.
export const kittyModifiers = {
	shift: 1,
	alt: 2,
	ctrl: 4,
	super: 8,
	hyper: 16,
	meta: 32,
	capsLock: 64,
	numLock: 128,
} as const;

// Options for configuring kitty keyboard protocol.
export type KittyKeyboardOptions = {
	// Mode for kitty keyboard protocol support.
	// - 'auto': Query interactive TTYs for support through the normal input handler, with a 200ms timeout (default). Suspending the terminal cancels pending detection.
	// - 'enabled': Force enable the protocol
	// - 'disabled': Never enable the protocol
	mode?: 'auto' | 'enabled' | 'disabled';

	// Protocol flags to request from the terminal.
	// Pass an array of flag name strings.
	//
	// Available flags:
	// - 'disambiguateEscapeCodes' - Disambiguate escape codes (default)
	// - 'reportEventTypes' - Report key press, repeat, and release events
	// - 'reportAlternateKeys' - Report alternate key encodings. Ink accepts these sequences but does not expose alternate keys. Without associated text, `useInput` uses the primary key as its input fallback.
	// - 'reportAllKeysAsEscapeCodes' - Report all keys as escape codes
	// - 'reportAssociatedText' - Report associated text with key events. Automatically enables `reportAllKeysAsEscapeCodes`.
	//
	// Enable reportAssociatedText when using reportAllKeysAsEscapeCodes to receive composed and shifted text in input. Without associated text, input falls back to the primary unshifted key. Alternate shifted and base-layout keys are not exposed or used for shortcut matching.
	flags?: KittyFlagName[];
};
