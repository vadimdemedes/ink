import process from 'node:process';
import React, {useEffect, useState} from 'react';
import {Box, Static, Text, render, useApp} from '../../src/index.js';

type RerenderFixtureOptions = {
	readonly completionMarker?: string;
	readonly frameLimit?: number;
	readonly includeStaticLine?: boolean;
	readonly rowsFallback?: number;
	readonly heightForFrame: (rows: number, frameCount: number) => number;
};

function Issue450RerenderFixtureComponent({
	completionMarker,
	frameLimit,
	includeStaticLine,
	heightForFrame,
	rows,
}: {
	readonly completionMarker?: string;
	readonly frameLimit: number;
	readonly includeStaticLine: boolean;
	readonly heightForFrame: (rows: number, frameCount: number) => number;
	readonly rows: number;
}) {
	const {exit} = useApp();
	const [frameCount, setFrameCount] = useState(0);
	const targetHeight = heightForFrame(rows, frameCount);

	useEffect(() => {
		if (frameCount >= frameLimit) {
			const timer = setTimeout(() => {
				if (completionMarker) {
					process.stdout.write(completionMarker);
				}

				exit();
			}, 0);

			return () => {
				clearTimeout(timer);
			};
		}

		const timer = setTimeout(() => {
			setFrameCount(previousFrameCount => previousFrameCount + 1);
		}, 100);

		return () => {
			clearTimeout(timer);
		};
	}, [completionMarker, exit, frameCount, frameLimit]);

	return (
		<>
			{includeStaticLine && (
				<Static items={['#450 static line']}>
					{item => <Text key={item}>{item}</Text>}
				</Static>
			)}
			<Box height={targetHeight} flexDirection="column">
				<Text>#450 top</Text>
				<Box flexGrow={1}>
					<Text>{`frame ${frameCount}`}</Text>
				</Box>
				<Text>#450 bottom</Text>
			</Box>
		</>
	);
}

export const runIssue450RerenderFixture = ({
	completionMarker,
	frameLimit = 8,
	includeStaticLine = false,
	rowsFallback = 6,
	heightForFrame,
}: RerenderFixtureOptions): void => {
	const rows = Number(process.argv[2]) || rowsFallback;
	process.stdout.rows = rows;

	render(
		<Issue450RerenderFixtureComponent
			completionMarker={completionMarker}
			frameLimit={frameLimit}
			includeStaticLine={includeStaticLine}
			heightForFrame={heightForFrame}
			rows={rows}
		/>,
	);
};

type InitialFixtureOptions = {
	readonly rowsFallback?: number;
	readonly renderedMarker: string;
	readonly lineCount: number;
	readonly linePrefix: string;
};

function Issue450InitialFixtureComponent({
	renderedMarker,
	lineCount,
	linePrefix,
}: {
	readonly renderedMarker: string;
	readonly lineCount: number;
	readonly linePrefix: string;
}) {
	const {exit} = useApp();

	useEffect(() => {
		const timer = setTimeout(() => {
			process.stdout.write(renderedMarker);
			exit();
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, [exit, renderedMarker]);

	const lines = [];
	for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
		lines.push(
			<Text key={lineNumber}>{`${linePrefix} line ${lineNumber}`}</Text>,
		);
	}

	return <Box flexDirection="column">{lines}</Box>;
}

export const runIssue450InitialFixture = ({
	rowsFallback = 3,
	renderedMarker,
	lineCount,
	linePrefix,
}: InitialFixtureOptions): void => {
	const rows = Number(process.argv[2]) || rowsFallback;
	process.stdout.rows = rows;

	render(
		<Issue450InitialFixtureComponent
			renderedMarker={renderedMarker}
			lineCount={lineCount}
			linePrefix={linePrefix}
		/>,
	);
};
