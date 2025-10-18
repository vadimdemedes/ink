import process from 'node:process';
import React from 'react';
import {render, useInput, useApp} from '../../src/index.js';

function UserInput({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();
	const arrowCountRef = React.useRef(0);
	const textEventCountRef = React.useRef(0);
	const mixedStageRef = React.useRef(0);
	const csiStageRef = React.useRef(0);
	const emojiCountRef = React.useRef(0);
	const emojiFamilyCountRef = React.useRef(0);
	const chunkedCsiCountRef = React.useRef(0);
	const chunkedMetaCountRef = React.useRef(0);
	const bracketedStageRef = React.useRef(0);
	const emptyBracketedStageRef = React.useRef(0);
	const bracketedContent = 'hello \u001B[Bworld';
	const chunkedMetaDelayedStageRef = React.useRef(0);
	const partialEscapeHandledRef = React.useRef(false);
	const invalidCsiStageRef = React.useRef(0);
	const oscTitleStageRef = React.useRef(0);
	const oscHyperlinkStageRef = React.useRef(0);
	const dcsStageRef = React.useRef(0);
	const escapeDepthStageRef = React.useRef(0);
	const escapeDepthExceededStageRef = React.useRef(0);
	const surrogateSeenRef = React.useRef(false);
	const surrogateTailSeenRef = React.useRef(false);

	useInput((input, key) => {
		if (test === 'oscTitle') {
			const expectedPayload = '0;Ink Title\u0007';
			const stage = oscTitleStageRef.current;

			if (stage === 0) {
				if (input !== ']' || key.escape || key.meta) {
					throw new Error(
						`Expected OSC introducer without modifiers, got ${JSON.stringify({input, key})}`,
					);
				}

				oscTitleStageRef.current = 1;
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
			const stage = oscHyperlinkStageRef.current;
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

			oscHyperlinkStageRef.current++;

			if (oscHyperlinkStageRef.current === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'dcsSequence') {
			const stage = dcsStageRef.current;

			if (stage === 0) {
				if (input !== 'P' || !key.meta || !key.shift) {
					throw new Error(
						`Expected DCS introducer with meta+shift, got ${JSON.stringify({
							input,
							key,
						})}`,
					);
				}

				dcsStageRef.current = 1;
				return;
			}

			if (stage === 1) {
				if (input !== '1;2|payload' || key.meta || key.escape) {
					throw new Error(
						`Expected DCS payload, got ${JSON.stringify({input, key})}`,
					);
				}

				dcsStageRef.current = 2;
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

			if (escapeDepthStageRef.current !== 0) {
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

			escapeDepthStageRef.current = 1;
			exit();
			return;
		}

		if (test === 'escapeDepthExceeded') {
			const stage = escapeDepthExceededStageRef.current;
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

				escapeDepthExceededStageRef.current = 1;
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

		if (test === 'isolatedSurrogate') {
			for (const char of input) {
				if (char === 'X') {
					if (surrogateTailSeenRef.current) {
						throw new Error(
							'Received duplicate trailing character for surrogate sequence',
						);
					}

					surrogateTailSeenRef.current = true;
					continue;
				}

				if (surrogateSeenRef.current) {
					throw new Error('Received duplicate surrogate placeholder');
				}

				surrogateSeenRef.current = true;
			}

			if (surrogateSeenRef.current && surrogateTailSeenRef.current) {
				exit();
			}

			return;
		}

		if (test === 'rapidArrows') {
			if (!key.downArrow || input !== '') {
				throw new Error('Expected down arrow event');
			}

			arrowCountRef.current++;

			if (arrowCountRef.current === 3) {
				exit();
				return;
			}

			if (arrowCountRef.current > 3) {
				throw new Error('Received extra down arrow events');
			}

			return;
		}

		if (test === 'coalescedText') {
			textEventCountRef.current++;

			if (textEventCountRef.current > 1) {
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

			const validator = validators[mixedStageRef.current];

			if (!validator) {
				throw new Error('Received more events than expected');
			}

			validator();

			mixedStageRef.current++;

			if (mixedStageRef.current === 3) {
				exit();
			}

			return;
		}

		if (test === 'csiFinals') {
			const expected = ['[@', '[200~'];
			const index = csiStageRef.current;

			if (index >= expected.length) {
				throw new Error('Received more CSI sequences than expected');
			}

			if (input !== expected[index]) {
				throw new Error(`Unexpected CSI sequence: ${JSON.stringify(input)}`);
			}

			csiStageRef.current++;

			if (csiStageRef.current === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'chunkedCsi') {
			chunkedCsiCountRef.current++;

			if (chunkedCsiCountRef.current > 1) {
				throw new Error('Expected a single CSI event when split across chunks');
			}

			if (input !== '[200~') {
				throw new Error(`Unexpected CSI input: ${JSON.stringify(input)}`);
			}

			exit();
			return;
		}

		if (test === 'invalidCsiParams') {
			const stage = invalidCsiStageRef.current;

			if (stage === 0) {
				if (!key.escape || input !== '') {
					throw new Error(
						'Expected escape key as the first event for invalid CSI',
					);
				}

				invalidCsiStageRef.current = 1;
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
			emojiCountRef.current++;

			if (emojiCountRef.current > 1) {
				throw new Error('Expected emoji paste to arrive as a single event');
			}

			if (input === '👋🌍') {
				exit();
				return;
			}

			throw new Error(`Unexpected emoji input: ${JSON.stringify(input)}`);
		}

		if (test === 'emojiFamilySingle' || test === 'emojiFamilyChunked') {
			emojiFamilyCountRef.current++;

			if (emojiFamilyCountRef.current > 1) {
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
			chunkedMetaCountRef.current++;

			if (chunkedMetaCountRef.current > 1) {
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
			const stage = chunkedMetaDelayedStageRef.current;

			if (stage === 0) {
				if (!key.escape || input !== '') {
					throw new Error('Expected an escape key event first');
				}

				chunkedMetaDelayedStageRef.current = 1;
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
			const expected = ['[200~', bracketedContent, '[201~'];
			const index = bracketedStageRef.current;

			if (index >= expected.length) {
				throw new Error('Received more bracketed paste events than expected');
			}

			if (input !== expected[index]) {
				throw new Error(
					`Unexpected bracketed paste input: ${JSON.stringify(input)}`,
				);
			}

			bracketedStageRef.current++;

			if (bracketedStageRef.current === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'emptyBracketedPaste') {
			const expected = ['[200~', '', '[201~'];
			const index = emptyBracketedStageRef.current;

			if (index >= expected.length) {
				throw new Error(
					'Received more empty bracketed paste events than expected',
				);
			}

			if (input !== expected[index]) {
				throw new Error(
					`Unexpected empty bracketed paste input: ${JSON.stringify(input)}`,
				);
			}

			emptyBracketedStageRef.current++;

			if (emptyBracketedStageRef.current === expected.length) {
				exit();
			}

			return;
		}

		if (test === 'partialEscapeDrop') {
			partialEscapeHandledRef.current = true;
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
			if (!partialEscapeHandledRef.current) {
				exit();
			}
		}, 50);
	}

	return null;
}

const app = render(<UserInput test={process.argv[2]} />);

await app.waitUntilExit();
console.log('exited');
