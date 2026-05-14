import React from 'react';
import {Box, Text, render, useApp, useInput} from '../../src/index.js';

function OnClickDemo() {
	const {exit} = useApp();
	const [primaryClicks, setPrimaryClicks] = React.useState(0);
	const [secondaryClicks, setSecondaryClicks] = React.useState(0);
	const [textClicks, setTextClicks] = React.useState(0);
	const [panelClicks, setPanelClicks] = React.useState(0);
	const [childClicks, setChildClicks] = React.useState(0);
	const [bottomOverlayClicks, setBottomOverlayClicks] = React.useState(0);
	const [topOverlayClicks, setTopOverlayClicks] = React.useState(0);
	const [lastClick, setLastClick] = React.useState('None yet');

	useInput(input => {
		if (input === 'q') {
			exit();
		}
	});

	const describeClick = (label: string, event: {x: number; y: number}) => {
		setLastClick(`${label} at x=${event.x}, y=${event.y}`);
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Text>Click any target below. Press “q” to exit.</Text>

			<Box gap={2}>
				<Box
					borderStyle="round"
					borderColor="green"
					paddingX={2}
					onClick={event => {
						setPrimaryClicks(count => count + 1);
						describeClick('Primary button', event);
					}}
				>
					<Text color="green">Primary</Text>
				</Box>

				<Box
					borderStyle="round"
					borderColor="blue"
					paddingX={2}
					onClick={event => {
						setSecondaryClicks(count => count + 1);
						describeClick('Secondary button', event);
					}}
				>
					<Text color="blue">Secondary</Text>
				</Box>

				<Box
					borderStyle="round"
					borderColor="red"
					paddingX={2}
					onClick={event => {
						setPrimaryClicks(0);
						setSecondaryClicks(0);
						setTextClicks(0);
						setPanelClicks(0);
						setChildClicks(0);
						setBottomOverlayClicks(0);
						setTopOverlayClicks(0);
						describeClick('Reset button', event);
					}}
				>
					<Text color="red">Reset</Text>
				</Box>
			</Box>

			<Text
				underline
				color="yellow"
				onClick={event => {
					setTextClicks(count => count + 1);
					describeClick('Clickable text', event);
				}}
			>
				Clickable text link
			</Text>

			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="magenta"
				paddingX={1}
				onClick={event => {
					setPanelClicks(count => count + 1);
					describeClick('Parent panel', event);
				}}
			>
				<Text color="magenta">Parent panel counts bubbled clicks</Text>
				<Text
					color="cyan"
					onClick={event => {
						setChildClicks(count => count + 1);
						describeClick('Child text inside panel', event);
					}}
				>
					Click this child text to increment both child and panel.
				</Text>
			</Box>

			<Box flexDirection="column">
				<Text>Overlapping boxes: only the top box should receive clicks.</Text>
				<Box width={28} height={3}>
					<Box
						position="absolute"
						left={0}
						top={0}
						borderStyle="round"
						borderColor="red"
						paddingX={2}
						onClick={event => {
							setBottomOverlayClicks(count => count + 1);
							describeClick('Bottom overlay', event);
						}}
					>
						<Text color="red">Bottom overlay</Text>
					</Box>

					<Box
						position="absolute"
						left={4}
						top={0}
						backgroundColor="green"
						borderStyle="round"
						borderColor="green"
						paddingX={2}
						onClick={event => {
							setTopOverlayClicks(count => count + 1);
							describeClick('Top overlay', event);
						}}
					>
						<Text color="black">Top overlay</Text>
					</Box>
				</Box>
			</Box>

			<Text>Primary clicks: {primaryClicks}</Text>
			<Text>Secondary clicks: {secondaryClicks}</Text>
			<Text>Text clicks: {textClicks}</Text>
			<Text>Panel clicks: {panelClicks}</Text>
			<Text>Child clicks: {childClicks}</Text>
			<Text>Bottom overlay clicks: {bottomOverlayClicks}</Text>
			<Text>Top overlay clicks: {topOverlayClicks}</Text>
			<Text>Last click: {lastClick}</Text>
		</Box>
	);
}

render(<OnClickDemo />, {
	alternateScreen: true,
});
