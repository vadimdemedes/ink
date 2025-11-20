import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';
import {writeReadySignal} from '../helpers/ready.js';

type CounterKey =
	| 'arrowCount'
	| 'textEventCount'
	| 'emojiCount'
	| 'emojiFamilyCount'
	| 'chunkedCsiCount'
	| 'chunkedMetaCount';

type StageKey =
	| 'mixedStage'
	| 'csiStage'
	| 'chunkedMetaDelayedStage'
	| 'bracketedStage'
	| 'emptyBracketedStage'
	| 'invalidCsiStage'
	| 'oscTitleStage'
	| 'oscHyperlinkStage'
	| 'dcsStage'
	| 'escapeDepthStage'
	| 'escapeDepthExceededStage';

type FlagKey = 'partialEscapeHandled' | 'surrogateSeen' | 'surrogateTailSeen';

type Counters = Record<CounterKey, number>;
type Stages = Record<StageKey, number>;
type Flags = Record<FlagKey, boolean>;

function makeZeroed<T extends string>(keys: readonly T[]): Record<T, number> {
	const out = Object.create(null) as Record<T, number>;
	for (const key of keys) {
		out[key] = 0;
	}

	return out;
}

function makeFalsey<T extends string>(keys: readonly T[]): Record<T, boolean> {
	const out = Object.create(null) as Record<T, boolean>;
	for (const key of keys) {
		out[key] = false;
	}

	return out;
}

const counterKeys = [
	'arrowCount',
	'textEventCount',
	'emojiCount',
	'emojiFamilyCount',
	'chunkedCsiCount',
	'chunkedMetaCount',
] as const;

const stageKeys = [
	'mixedStage',
	'csiStage',
	'chunkedMetaDelayedStage',
	'bracketedStage',
	'emptyBracketedStage',
	'invalidCsiStage',
	'oscTitleStage',
	'oscHyperlinkStage',
	'dcsStage',
	'escapeDepthStage',
	'escapeDepthExceededStage',
] as const;

const flagKeys = [
	'partialEscapeHandled',
	'surrogateSeen',
	'surrogateTailSeen',
] as const;

export type Probe = {
	readonly counters: Counters;
	readonly stages: Stages;
	readonly flags: Flags;
	inc: (key: CounterKey, by?: number) => void;
	nextStage: (key: StageKey) => void;
	setStage: (key: StageKey, value: number) => void;
	setFlag: (key: FlagKey, value?: boolean) => void;
	reset: () => void;
	snapshot: () => {counters: Counters; stages: Stages; flags: Flags};
};

export function createProbe(): Probe {
	const counters = makeZeroed(counterKeys);
	const stages = makeZeroed(stageKeys);
	const flags = makeFalsey(flagKeys);

	const api: Probe = {
		counters,
		stages,
		flags,
		inc(key, by = 1) {
			counters[key] += by;
		},
		nextStage(key) {
			stages[key] += 1;
		},
		setStage(key, value) {
			stages[key] = value;
		},
		setFlag(key, value = true) {
			flags[key] = value;
		},
		reset() {
			for (const k of counterKeys) counters[k] = 0;
			for (const k of stageKeys) stages[k] = 0;
			for (const k of flagKeys) flags[k] = false;
		},
		snapshot() {
			return {
				counters: {...counters},
				stages: {...stages},
				flags: {...flags},
			};
		},
	};

	return api;
}

export function useProbe(): Probe {
	const ref = React.useRef<Probe>();
	ref.current ||= createProbe();

	return ref.current;
}

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();
	const probe = useProbe();
	const bracketedContent = 'hello \u001B[Bworld';

	useInput((input, key) => {
		if (test === 'oscTitle') {
			const expectedPayload = '0;Ink Title\u0007';
			const stage = probe.stages.oscTitleStage;

			if (stage === 0) {
				if (input !== ']' || key.escape || key.meta) {
					throw new Error(
						`Expected OSC introducer without modifiers, got ${JSON.stringify({input, key})}`,
					);
				}

				probe.setStage('oscTitleStage', 1);
				return;
			}

			if (stage === 1) {
				if (input !== expectedPayload) {
					throw new Error(
						`Expected OSC payload ${JSON.stringify(expectedPayload)}, got ${JSON.stringify(input)}`,
					);
				}

				exit();
				return;
			}

			throw new Error('Received more OSC title events than expected');
		}

		if (test === 'oscHyperlink') {
			const expected = [
				']',
				'8;;https://example.com\u0007Ink Hyperlink',
				']',
				'8;;\u0007',
			];
			const stage = probe.stages.oscHyperlinkStage;
			const expectedValue = expected[stage];

			if (!expectedValue) {
				throw new Error('Received more OSC hyperlink events than expected');
			}

			if (input !== expectedValue) {
				throw new Error(
					`Unexpected OSC hyperlink segment: ${JSON.stringify({
						stage,
						input,
					})}`,
				);
			}

			probe.nextStage('oscHyperlinkStage');

			if (probe.stages.oscHyperlinkStage === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'dcsSequence') {
			const stage = probe.stages.dcsStage;

			if (stage === 0) {
				if (input !== 'P' || !key.meta || !key.shift) {
					throw new Error(
						`Expected DCS introducer with meta+shift, got ${JSON.stringify({
							input,
							key,
						})}`,
					);
				}

				probe.setStage('dcsStage', 1);
				return;
			}

			if (stage === 1) {
				if (input !== '1;2|payload' || key.meta || key.escape) {
					throw new Error(
						`Expected DCS payload, got ${JSON.stringify({input, key})}`,
					);
				}

				probe.setStage('dcsStage', 2);
				return;
			}

			if (stage === 2) {
				if (input !== '\\' || key.meta || key.escape) {
					throw new Error(
						`Expected DCS string terminator, got ${JSON.stringify({
							input,
							key,
						})}`,
					);
				}

				exit();
				return;
			}

			throw new Error('Received more DCS events than expected');
		}

		if (test === 'escapeDepthBoundary') {
			const expected = '\u001B'.repeat(31) + 'A';

			if (probe.stages.escapeDepthStage !== 0) {
				throw new Error(
					'Received more events than expected for depth boundary',
				);
			}

			if (input !== expected || key.escape || key.meta) {
				throw new Error(
					`Expected nested escape payload ${JSON.stringify(expected)}, got ${JSON.stringify(
						{
							input,
							key,
						},
					)}`,
				);
			}

			probe.setStage('escapeDepthStage', 1);
			exit();
			return;
		}

		if (test === 'escapeDepthExceeded') {
			const stage = probe.stages.escapeDepthExceededStage;
			const expected = '\u001B'.repeat(31) + 'A';

			if (stage === 0) {
				if (!key.escape || input !== '') {
					throw new Error(
						`Expected standalone escape key before overflow payload, got ${JSON.stringify(
							{
								input,
								key,
							},
						)}`,
					);
				}

				probe.setStage('escapeDepthExceededStage', 1);
				return;
			}

			if (stage === 1) {
				if (input !== expected || key.escape || key.meta) {
					throw new Error(
						`Expected overflow payload ${JSON.stringify(expected)}, got ${JSON.stringify(
							{
								input,
								key,
							},
						)}`,
					);
				}

				exit();
				return;
			}

			throw new Error(
				'Received more events than expected when escape depth exceeded',
			);
		}

		if (test === 'flagEmoji') {
			if (input === '🇺🇳') {
				exit();
				return;
			}

			throw new Error(`Unexpected flag emoji input: ${JSON.stringify(input)}`);
		}

		if (test === 'variationSelectorEmoji') {
			if (input === '✂️') {
				exit();
				return;
			}

			throw new Error(
				`Unexpected variation selector input: ${JSON.stringify(input)}`,
			);
		}

		if (test === 'keycapEmoji') {
			if (input === '1️⃣') {
				exit();
				return;
			}

			throw new Error(`Unexpected keycap input: ${JSON.stringify(input)}`);
		}

		if (test === 'airplaneEmojiChunked') {
			probe.inc('emojiCount');

			if (probe.counters.emojiCount > 1) {
				throw new Error(
					'Airplane emoji with VS16 should arrive as single event when chunked',
				);
			}

			if (input !== '✈️') {
				throw new Error(
					`Expected airplane emoji "✈️", got ${JSON.stringify(input)}`,
				);
			}

			exit();
			return;
		}

		if (test === 'heartEmojiChunked') {
			probe.inc('emojiCount');

			if (probe.counters.emojiCount > 1) {
				throw new Error(
					'Heart emoji with VS16 should arrive as single event when chunked',
				);
			}

			if (input !== '♥️') {
				throw new Error(
					`Expected heart emoji "♥️", got ${JSON.stringify(input)}`,
				);
			}

			exit();
			return;
		}

		if (test === 'isolatedSurrogate') {
			for (const char of input) {
				if (char === 'X') {
					if (probe.flags.surrogateTailSeen) {
						throw new Error(
							'Received duplicate trailing character for surrogate sequence',
						);
					}

					probe.setFlag('surrogateTailSeen');
					continue;
				}

				if (probe.flags.surrogateSeen) {
					throw new Error('Received duplicate surrogate placeholder');
				}

				probe.setFlag('surrogateSeen');
			}

			if (probe.flags.surrogateSeen && probe.flags.surrogateTailSeen) {
				exit();
			}

			return;
		}

		if (test === 'rapidArrows') {
			if (!key.downArrow || input !== '') {
				throw new Error('Expected down arrow event');
			}

			probe.inc('arrowCount');

			if (probe.counters.arrowCount === 3) {
				exit();
				return;
			}

			if (probe.counters.arrowCount > 3) {
				throw new Error('Received extra down arrow events');
			}

			return;
		}

		if (test === 'coalescedText') {
			probe.inc('textEventCount');

			if (probe.counters.textEventCount > 1) {
				throw new Error('Expected a single text event');
			}

			if (input === 'hello world') {
				exit();
				return;
			}

			throw new Error(`Unexpected text input: ${input}`);
		}

		if (test === 'mixedSequence') {
			const validators = [
				() => {
					if (!key.downArrow || input !== '') {
						throw new Error('Expected a down arrow as the first event');
					}
				},
				() => {
					if (input !== 'hello') {
						throw new Error('Expected plain text as the second event');
					}
				},
				() => {
					if (!key.downArrow || input !== '') {
						throw new Error('Expected a down arrow as the final event');
					}
				},
			];

			const validator = validators[probe.stages.mixedStage];

			if (!validator) {
				throw new Error('Received more events than expected');
			}

			validator();

			probe.nextStage('mixedStage');

			if (probe.stages.mixedStage === 3) {
				exit();
			}

			return;
		}

		if (test === 'csiFinals') {
			const expected = ['[@', '[100~'];
			const index = probe.stages.csiStage;

			if (index >= expected.length) {
				throw new Error('Received more CSI sequences than expected');
			}

			if (input !== expected[index]) {
				throw new Error(`Unexpected CSI sequence: ${JSON.stringify(input)}`);
			}

			probe.nextStage('csiStage');

			if (probe.stages.csiStage === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'chunkedCsi') {
			probe.inc('chunkedCsiCount');

			if (probe.counters.chunkedCsiCount > 1) {
				throw new Error('Expected a single CSI event when split across chunks');
			}

			if (input !== '[100~') {
				throw new Error(`Unexpected CSI input: ${JSON.stringify(input)}`);
			}

			exit();
			return;
		}

		if (test === 'invalidCsiParams') {
			const stage = probe.stages.invalidCsiStage;

			if (stage === 0) {
				if (!key.escape || input !== '') {
					throw new Error(
						'Expected escape key as the first event for invalid CSI',
					);
				}

				probe.setStage('invalidCsiStage', 1);
				return;
			}

			if (stage === 1) {
				if (input !== '[12\u0000\u0001@') {
					throw new Error(
						`Expected invalid CSI payload as plain text, got ${JSON.stringify(input)}`,
					);
				}

				exit();
				return;
			}

			throw new Error('Received more events than expected for invalid CSI');
		}

		if (test === 'emojiPaste') {
			probe.inc('emojiCount');

			if (probe.counters.emojiCount > 1) {
				throw new Error('Expected emoji paste to arrive as a single event');
			}

			if (input === '👋🌍') {
				exit();
				return;
			}

			throw new Error(`Unexpected emoji input: ${JSON.stringify(input)}`);
		}

		if (test === 'emojiFamilySingle' || test === 'emojiFamilyChunked') {
			probe.inc('emojiFamilyCount');

			if (probe.counters.emojiFamilyCount > 1) {
				throw new Error('Expected emoji family to arrive as a single event');
			}

			if (input === '👨‍👩‍👧‍👦') {
				exit();
				return;
			}

			throw new Error(
				`Unexpected emoji family input: ${JSON.stringify(input)}`,
			);
		}

		if (test === 'lowercase' && input === 'q') {
			exit();
			return;
		}

		if (test === 'uppercase' && input === 'Q' && key.shift) {
			exit();
			return;
		}

		if (test === 'uppercase' && input === '\r' && !key.shift) {
			exit();
			return;
		}

		if (test === 'pastedCarriageReturn' && input === '\rtest') {
			exit();
			return;
		}

		if (test === 'pastedTab' && input === '\ttest') {
			exit();
			return;
		}

		if (test === 'escape' && key.escape) {
			exit();
			return;
		}

		if (test === 'ctrl' && input === 'f' && key.ctrl) {
			exit();
			return;
		}

		if (test === 'meta' && input === 'm' && key.meta) {
			exit();
			return;
		}

		if (test === 'chunkedMetaLetter') {
			probe.inc('chunkedMetaCount');

			if (probe.counters.chunkedMetaCount > 1) {
				throw new Error(
					'Expected a single meta letter event when split across chunks',
				);
			}

			if (input === 'b' && key.meta) {
				exit();
				return;
			}

			throw new Error(`Unexpected meta input: ${JSON.stringify(input)}`);
		}

		if (test === 'chunkedMetaLetterDelayed') {
			const stage = probe.stages.chunkedMetaDelayedStage;

			if (stage === 0) {
				if (!key.escape || input !== '') {
					throw new Error('Expected an escape key event first');
				}

				probe.setStage('chunkedMetaDelayedStage', 1);
				return;
			}

			if (stage === 1) {
				if (input !== 'b' || key.meta || key.escape) {
					throw new Error(
						`Expected plain letter after delayed meta sequence, got ${JSON.stringify({input, key})}`,
					);
				}

				exit();
				return;
			}

			throw new Error(
				'All events must resolve before the delayed meta sequence completes',
			);
		}

		if (test === 'bracketedPaste') {
			// Should receive pasted content with isPaste flag, NOT the markers
			if (input === '[200~' || input === '[201~') {
				throw new Error('Bracketed paste markers should not reach userland');
			}

			if (!key.isPaste) {
				throw new Error('Expected isPaste flag to be true for pasted content');
			}

			if (input !== bracketedContent) {
				throw new Error(
					`Expected pasted content "${bracketedContent}", got ${JSON.stringify(input)}`,
				);
			}

			exit();
			return;
		}

		if (test === 'emptyBracketedPaste') {
			// Should receive empty content with isPaste flag, NOT the markers
			if (input === '[200~' || input === '[201~') {
				throw new Error('Bracketed paste markers should not reach userland');
			}

			if (!key.isPaste) {
				throw new Error('Expected isPaste flag to be true for empty paste');
			}

			if (input !== '') {
				throw new Error(
					`Expected empty pasted content, got ${JSON.stringify(input)}`,
				);
			}

			exit();
			return;
		}

		if (test === 'partialEscapeDrop') {
			probe.setFlag('partialEscapeHandled');
			throw new Error('Partial escape should be dropped before emitting input');
		}

		if (test === 'upArrow' && key.upArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'downArrow' && key.downArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'leftArrow' && key.leftArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'rightArrow' && key.rightArrow && !key.meta) {
			exit();
			return;
		}

		if (test === 'upArrowMeta' && key.upArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'downArrowMeta' && key.downArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'leftArrowMeta' && key.leftArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'rightArrowMeta' && key.rightArrow && key.meta) {
			exit();
			return;
		}

		if (test === 'upArrowCtrl' && key.upArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'downArrowCtrl' && key.downArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'leftArrowCtrl' && key.leftArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'rightArrowCtrl' && key.rightArrow && key.ctrl) {
			exit();
			return;
		}

		if (test === 'pageDown' && key.pageDown && !key.meta) {
			exit();
			return;
		}

		if (test === 'pageUp' && key.pageUp && !key.meta) {
			exit();
			return;
		}

		if (test === 'tab' && input === '' && key.tab && !key.ctrl) {
			exit();
			return;
		}

		if (test === 'shiftTab' && input === '' && key.tab && key.shift) {
			exit();
			return;
		}

		if (test === 'backspace' && input === '' && key.backspace) {
			exit();
			return;
		}

		if (test === 'delete' && input === '' && key.delete) {
			exit();
			return;
		}

		if (test === 'remove' && input === '' && key.delete) {
			exit();
			return;
		}

		throw new Error('Crash');
	});

	if (test === 'partialEscapeDrop') {
		setTimeout(() => {
			if (!probe.flags.partialEscapeHandled) {
				exit();
			}
		}, 50);
	}

	return null;
}

const app = render(<UserInput test={process.argv[2]} />);

// Signal to test harness that Ink is ready to accept input
writeReadySignal();

await app.waitUntilExit();
console.log('exited');
