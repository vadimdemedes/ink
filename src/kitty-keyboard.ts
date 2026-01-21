/**
 * Kitty keyboard protocol flags.
 * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */
export const kittyFlags = {
	disambiguateEscapeCodes: 1,
	reportEventTypes: 2,
	reportAlternateKeys: 4,
	reportAllKeysAsEscapeCodes: 8,
	reportAssociatedText: 16,
} as const;

/**
 * Kitty keyboard modifier bits.
 * These are used in the modifier parameter of CSI u sequences.
 * Note: The actual modifier value is (modifiers - 1) as per the protocol.
 */
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

/**
 * Options for configuring kitty keyboard protocol.
 */
export type KittyKeyboardOptions = {
	/**
	 * Mode for kitty keyboard protocol support.
	 * - 'auto': Attempt to detect terminal support (default)
	 * - 'enabled': Force enable the protocol
	 * - 'disabled': Never enable the protocol
	 *
	 * @default 'auto'
	 */
	mode?: 'auto' | 'enabled' | 'disabled';

	/**
	 * Protocol flags to request from the terminal.
	 * Uses KittyFlags constants.
	 *
	 * @default KittyFlags.DISAMBIGUATE_ESCAPE_CODES
	 */
	flags?: number;

	/**
	 * Timeout in milliseconds to wait for terminal response during auto-detection.
	 *
	 * @default 100
	 */
	detectionTimeout?: number;
};
