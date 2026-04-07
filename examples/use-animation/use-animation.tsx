import React, {useState, useRef} from 'react';
import {render, Text, Box, useInput, useAnimation} from '../../src/index.js';

const rainbowColors = [
	'red',
	'yellow',
	'green',
	'cyan',
	'blue',
	'magenta',
] as const;

const sparkleChars = ['✦', '✧', '·', '⋆'];
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const trailChar = '━';
const maxTrail = rainbowColors.length * 3;
const trackWidth = 44;

function UseAnimationDemo() {
	const [paused, setPaused] = useState(false);

	// Three animations at different speeds
	const {frame: fast} = useAnimation({interval: 80, isActive: !paused});
	const {frame: movement} = useAnimation({interval: 50, isActive: !paused});
	const {frame: slow} = useAnimation({interval: 400, isActive: !paused});

	// Freeze displayed values while paused so the scene holds still.
	// On unpause the hooks reset to 0, but since every animation
	// uses modular arithmetic the visual just picks up seamlessly.
	const frozenRef = useRef({fast: 0, movement: 0, slow: 0});

	if (!paused) {
		frozenRef.current = {fast, movement, slow};
	}

	const frame = frozenRef.current;

	useInput(input => {
		if (input === ' ') {
			setPaused(previous => !previous);
		}
	});

	// Unicorn wraps around the track circularly
	const position = frame.movement % trackWidth;

	// Build each cell: trail wraps around behind the unicorn
	const cells: Array<{text: string; color?: (typeof rainbowColors)[number]}> =
		[];

	for (let column = 0; column < trackWidth; column++) {
		if (column === position) {
			cells.push({text: '🦄'});
		} else {
			const distBehind = (position - column + trackWidth) % trackWidth;

			if (distBehind > 0 && distBehind <= maxTrail) {
				const colorIndex =
					rainbowColors.length - 1 - Math.floor((distBehind - 1) / 3);
				cells.push({text: trailChar, color: rainbowColors[colorIndex]});
			} else {
				cells.push({text: ' '});
			}
		}
	}

	// Group consecutive cells with the same color into segments
	const segments: Array<{
		text: string;
		color?: (typeof rainbowColors)[number];
	}> = [];

	for (const cell of cells) {
		const last = segments.at(-1);

		if (last !== undefined && last.color === cell.color) {
			last.text += cell.text;
		} else {
			segments.push({...cell});
		}
	}

	// Sparkle line
	const sparkleLine = (seed: number) =>
		Array.from({length: trackWidth + 4}, (_, index) =>
			(index * 7 + seed * 13) % 19 < 3
				? sparkleChars[(frame.slow + index + seed) % sparkleChars.length]!
				: ' ',
		).join('');

	const title = 'Unicorns are magical!';
	const spinner = spinnerFrames[frame.fast % spinnerFrames.length]!;

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>
				{'  '}
				{[...title].map((character, index) => {
					const color =
						rainbowColors[(frame.fast + index) % rainbowColors.length];

					return (
						// eslint-disable-next-line react/no-array-index-key
						<Text key={index} color={color}>
							{character}
						</Text>
					);
				})}
			</Text>
			<Text />
			<Text>
				{'  '}
				{sparkleLine(0)}
			</Text>
			<Text>
				{'  '}
				{segments.map((segment, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<Text key={index} color={segment.color}>
						{segment.text}
					</Text>
				))}
			</Text>
			<Text>
				{'  '}
				{sparkleLine(5)}
			</Text>
			<Text />
			<Text color="cyan">
				{'  '}
				{spinner} Loading more unicorns...
			</Text>
			<Text />
			<Text dimColor>
				{'  '}Press {'<'}space{'>'} to {paused ? 'resume' : 'pause'}
			</Text>
		</Box>
	);
}

render(<UseAnimationDemo />);
