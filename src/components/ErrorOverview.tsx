import * as fs from 'node:fs';
import {cwd} from 'node:process';
import React from 'react';
import StackUtils from 'stack-utils';
import codeExcerpt, {type CodeExcerpt} from 'code-excerpt';
import Box from './Box.js';
import Text from './Text.js';

// Error's source file is reported as file:///home/user/file.js
// This function removes the file://[cwd] part
const cleanupPath = (path: string | undefined): string | undefined => {
	return path?.replace(`file://${cwd()}/`, '');
};

const stackUtils = new StackUtils({
	cwd: cwd(),
	internals: StackUtils.nodeInternals(),
});

type Props = {
	readonly error: Error;
};

export default function ErrorOverview({error}: Props) {
	const stack = error.stack ? error.stack.split('\n').slice(1) : undefined;
	const origin = stack ? stackUtils.parseLine(stack[0]!) : undefined;
	const filePath = cleanupPath(origin?.file);
	let excerpt: CodeExcerpt[] | undefined;
	let lineWidth = 0;

	if (filePath && origin?.line && fs.existsSync(filePath)) {
		const sourceCode = fs.readFileSync(filePath, 'utf8');
		excerpt = codeExcerpt(sourceCode, origin.line);

		if (excerpt) {
			for (const {line} of excerpt) {
				lineWidth = Math.max(lineWidth, String(line).length);
			}
		}
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box>
				<Text backgroundColor="red" color="white">
					{' '}
					ERROR{' '}
				</Text>

				<Text> {error.message}</Text>
			</Box>

			{origin && filePath && (
				<Box marginTop={1}>
					<Text dimColor>
						{filePath}:{origin.line}:{origin.column}
					</Text>
				</Box>
			)}

			{origin && excerpt && (
				<Box marginTop={1} flexDirection="column">
					{excerpt.map(({line, value}) => (
						<Box key={line}>
							<Box width={lineWidth + 1}>
								<Text
									dimColor={line !== origin.line}
									backgroundColor={line === origin.line ? 'red' : undefined}
									color={line === origin.line ? 'white' : undefined}
									aria-label={
										line === origin.line
											? `Line ${line}, error`
											: `Line ${line}`
									}
								>
									{String(line).padStart(lineWidth, ' ')}:
								</Text>
							</Box>

							<Text
								key={line}
								backgroundColor={line === origin.line ? 'red' : undefined}
								color={line === origin.line ? 'white' : undefined}
							>
								{' ' + value}
							</Text>
						</Box>
					))}
				</Box>
			)}

			{error.stack && (
				<Box marginTop={1} flexDirection="column">
					{error.stack
						.split('\n')
						.slice(1)
						.map(line => {
							const parsedLine = stackUtils.parseLine(line);

							// If the line from the stack cannot be parsed, we print out the unparsed line.
							if (!parsedLine) {
								return (
									<Box key={line}>
										<Text dimColor>- </Text>
										<Text dimColor bold>
											{line}
											\t{' '}
										</Text>
									</Box>
								);
							}

							return (
								<Box key={line}>
									<Text dimColor>- </Text>
									<Text dimColor bold>
										{parsedLine.function}
									</Text>
									<Text
										dimColor
										color="gray"
										aria-label={`at ${
											cleanupPath(parsedLine.file) ?? ''
										} line ${parsedLine.line} column ${parsedLine.column}`}
									>
										{' '}
										({cleanupPath(parsedLine.file) ?? ''}:{parsedLine.line}:
										{parsedLine.column})
									</Text>
								</Box>
							);
						})}
				</Box>
			)}
		</Box>
	);
}
