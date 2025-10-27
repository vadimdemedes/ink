/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import test from 'ava';
import {Box, Text} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

const borderVariations = [
	{
		name: 'with-border',
		borderStyle: 'single' as const,
		heightModifier: 2,
	},
	{
		name: 'without-border',
		borderStyle: undefined,
		heightModifier: 0,
	},
];

test('parameterized sticky header states', t => {
	const scenarios = [
		{
			name: 'initial',
			scrollTop: 0,
			description: 'H1 naturally at top',
		},
		{
			name: 'h1_stuck',
			scrollTop: 1,
			description: 'H1 stuck to viewport top',
		},
		{
			name: 'h1_stuck',
			scrollTop: 2,
			description: 'H1 stuck to viewport top',
		},
		{
			name: 'h1_pushed',
			scrollTop: 6,
			description: 'H1 pushed up by container bottom',
		},
		{
			name: 'h2_natural',
			scrollTop: 7,
			description: 'H1 scrolled out, H2 naturally at top',
		},
		{
			name: 'h2_stuck',
			scrollTop: 8,
			description: 'H2 stuck to viewport top',
		},
		{
			name: 'h2_stuck',
			scrollTop: 10,
			description: 'H2 stuck to viewport top',
		},
		{
			name: 'scrolled_out',
			scrollTop: 10_000,
			description: 'All headers scrolled out of view',
		},
	];

	for (const {name, scrollTop, description} of scenarios) {
		for (const borderVariation of borderVariations) {
			const output = renderToString(
				<Box
					height={4 + borderVariation.heightModifier}
					overflowY="scroll"
					flexDirection="column"
					scrollTop={scrollTop}
					borderStyle={borderVariation.borderStyle}
				>
					<Box flexDirection="column" flexShrink={0}>
						{/* Group 1: Height 4 (Header 2 lines + 2 items) */}
						<Box flexDirection="column">
							<Box sticky opaque height={2} flexDirection="column" width="100%">
								<Text>H1-Top</Text>
								<Text>H1-Bottom</Text>
							</Box>
							<Text>Item 1-1</Text>
							<Text>Item 1-2</Text>
							<Text>Item 1-3</Text>
							<Text>Item 1-4</Text>
							<Text>Item 1-5</Text>
						</Box>
						{/* Group 2 */}
						<Box flexDirection="column">
							<Box
								sticky
								opaque
								width="100%"
								stickyChildren={<Text>H2 (stuck)</Text>}
							>
								<Text>H2</Text>
							</Box>
							<Text>Item 2-1</Text>
							<Text>Item 2-2</Text>
							<Text>Item 2-3</Text>
							<Text>Item 2-4</Text>
							<Text>Item 2-5</Text>
						</Box>
						{/* Group 3. No sticky headers */}
						<Box flexDirection="column">
							<Text>Item 3-1</Text>
							<Text>Item 3-2</Text>
							<Text>Item 3-3</Text>
							<Text>Item 3-4</Text>
							<Text>Item 3-5</Text>
						</Box>
					</Box>
				</Box>,
			);

			t.snapshot(
				output,
				`${name} (scrollTop: ${scrollTop}) - ${description} - ${borderVariation.name}`,
			);
		}
	}
});

test('sticky header with alternate content with larger height', t => {
	const scenarios = [
		{
			name: 'initial',
			scrollTop: 0,
			description: 'Regular content visible',
		},
		{
			name: 'not_stuck_yet',
			scrollTop: 1,
			description: 'Scrolled one line, header still not stuck',
		},
		{
			name: 'header_at_top',
			scrollTop: 2,
			description: 'Header at top of viewport, but not stuck',
		},
		{
			name: 'stuck_scrolled',
			scrollTop: 3,
			description: 'Header stuck, content scrolling underneath',
		},
		{
			name: 'stuck_scrolled',
			scrollTop: 6,
			description: 'Header stuck, content scrolling all the way underneath',
		},
		{
			name: 'pushed_up',
			scrollTop: 8,
			description: 'Alternate content pushed half way up as it scrolls out',
		},
		{
			name: 'scrolled_out',
			scrollTop: 9,
			description: 'Header scrolled out',
		},
	];

	for (const {name, scrollTop, description} of scenarios) {
		for (const borderVariation of borderVariations) {
			const output = renderToString(
				<Box
					height={5 + borderVariation.heightModifier}
					overflowY="scroll"
					flexDirection="column"
					scrollTop={scrollTop}
					width={30}
					borderStyle={borderVariation.borderStyle}
				>
					<Box flexDirection="column" flexShrink={0}>
						<Text>Top 1</Text>
						<Text>Top 2</Text>
						<Box flexDirection="column">
							<Box
								sticky
								opaque
								flexDirection="column"
								width="100%"
								stickyChildren={
									<Box opaque flexDirection="column">
										<Text>HEADER 1 (stuck)</Text>
										<Text>HEADER 2 (stuck)</Text>
									</Box>
								}
							>
								<Text>HEADER REG</Text>
							</Box>
							<Text>Item 1 has long text</Text>
							<Text>Item 2 has long text</Text>
							<Text>Item 3 has long text</Text>
							<Text>Item 4 has long text</Text>
							<Text>Item 5 has long text</Text>
						</Box>
						<Text>Bottom 1</Text>
						<Text>Bottom 2</Text>
						<Text>Bottom 3</Text>
						<Text>Bottom 4</Text>
						<Text>Bottom 5</Text>
						<Text>Bottom 6</Text>
					</Box>
				</Box>,
			);

			t.snapshot(
				output,
				`${name} (scrollTop: ${scrollTop}) - ${description} - ${borderVariation.name}`,
			);
		}
	}
});

// This is a regression test for a bug where sticky headers would stick at the offset
// of the scrollable's padding resulting in scrollable content rendering on the lines
// before the sticky header for the case of a scrollable with padding.
test('sticky header ignores parent padding when stuck', t => {
	const scenarios = [
		{
			scrollTop: 0,
			description: 'Initial state, header below padding',
		},
		{
			scrollTop: 1,
			description: 'Scrolled 1 line, header moves up',
		},
		{
			scrollTop: 2,
			description: 'Scrolled 2 lines (past padding), header should be at top',
		},
		{
			scrollTop: 3,
			description: 'Scrolled 3 lines, header should remain at top',
		},
	];

	for (const {scrollTop, description} of scenarios) {
		const output = renderToString(
			<Box
				height={5}
				width={20}
				overflowY="scroll"
				flexDirection="column"
				scrollTop={scrollTop}
				paddingTop={2}
			>
				<Box sticky flexShrink={0}>
					<Text>Header</Text>
				</Box>
				<Box flexDirection="column" flexShrink={0}>
					<Text>Item 1</Text>
					<Text>Item 2</Text>
					<Text>Item 3</Text>
					<Text>Item 4</Text>
					<Text>Item 5</Text>
				</Box>
			</Box>,
		);

		t.snapshot(output, `scrollTop: ${scrollTop} - ${description}`);
	}
});
