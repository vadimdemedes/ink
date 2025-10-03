/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {Text} from '../../src/index.js';

/**
 * Renders text with styled interpolations for i18n.
 *
 * This implements the "Semantic Interpolation Pattern" for React Ink environments:
 * - Provides complete semantic context for translators
 * - Avoids fragmented translation keys
 * - Supports complex styling in terminal environments
 * - Compatible with React Ink's Text component limitations
 *
 * @param text - The translated text with {key} placeholders
 * @param styleMap - Map of keys to their styled React components
 * @param defaultColor - Default text color for the container
 * @returns Styled text component or throws error on mismatch
 * @throws Error when placeholders and styleMap don't match
 *
 * @example
 * // Translation: "Shell mode: Execute commands via {symbol} (e.g., {example})"
 * renderStyledText(t('shellMode'), {
 *   symbol: <Text bold color="purple">!</Text>,
 *   example: <Text bold color="purple">!npm start</Text>
 * }, 'white')
 */
export function renderStyledText(
	text: string,
	styleMap: Record<string, React.ReactNode>,
	defaultColor?: string,
): React.ReactElement {
	// Extract all placeholders from the text
	const placeholderMatches = text.match(/{[^}]+}/g) ?? [];
	const extractedPlaceholders = placeholderMatches.map((match: string) =>
		match.slice(1, -1),
	);

	// Get styleMap keys
	const styleMapKeys = Object.keys(styleMap);

	// Check for mismatches and provide detailed error messages
	const missingInStyleMap = extractedPlaceholders.filter(
		key => !styleMapKeys.includes(key),
	);
	const unusedInStyleMap = styleMapKeys.filter(
		key => !extractedPlaceholders.includes(key),
	);

	if (missingInStyleMap.length > 0 || unusedInStyleMap.length > 0) {
		const errorDetails: string[] = [];
		if (missingInStyleMap.length > 0) {
			errorDetails.push(`Missing in styleMap: ${missingInStyleMap.join(', ')}`);
		}

		if (unusedInStyleMap.length > 0) {
			errorDetails.push(`Unused in styleMap: ${unusedInStyleMap.join(', ')}`);
		}

		throw new Error(
			`Placeholder/styleMap mismatch in renderStyledText. ${errorDetails.join('; ')}`,
		);
	}

	// Split the text by placeholders and rebuild with styled components
	const parts = text.split(/({[^}]+})/);

	return (
		<Text color={defaultColor}>
			{parts
				// eslint-disable-next-line @typescript-eslint/promise-function-async
				.map((part, _index) => {
					const match = /^{([^}]+)}$/.exec(part);
					if (match) {
						const key = match[1];
						return styleMap[key] as React.ReactNode; // Now guaranteed to exist due to validation above
					}

					return part;
				})
				.map((element, index) => (
					<React.Fragment key={`fragment-${String(index)}`}>
						{element}
					</React.Fragment>
				))}
		</Text>
	);
}
