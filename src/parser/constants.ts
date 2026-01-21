export const tab = '\t';
export const shiftTab = '\u001B[Z';
export const escape = '\u001B';
export const zeroWidthJoiner = '\u200D';
export const extendedPictographic = /\p{Extended_Pictographic}/u;
export const combiningMark = /\p{Mark}/u;
export const skinToneModifierStart = 127_995; // U+1F3FB (🏻) Light skin tone
export const skinToneModifierEnd = 127_999; // U+1F3FF (🏿) Dark skin tone
export const variationSelector15 = 0xfe_0e; // Text style presentation
export const variationSelector16 = 0xfe_0f; // Emoji style presentation
export const extendedVariationSelectorStart = 0xe_01_00; // Extended VS range start
export const extendedVariationSelectorEnd = 0xe_01_ef; // Extended VS range end
export const bracketedPasteStart = '\u001B[200~';
export const bracketedPasteEnd = '\u001B[201~';
export const maxCarrySize = 4 * 1024;
export const maxPasteSize = 1024 * 1024; // 1MB - prevent memory exhaustion from unbounded paste
export const csiParamByte = /^[\u0020-\u003F]$/;
export const csiFinalByte = /[\u0040-\u007E]/;
export const maxEscapeDepth = 32;
export const graphemeSegmenter =
	typeof Intl.Segmenter === 'function'
		? new Intl.Segmenter(undefined, {granularity: 'grapheme'})
		: undefined;
