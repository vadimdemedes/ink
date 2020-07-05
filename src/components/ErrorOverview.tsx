import * as fs from 'fs';
import React from 'react';
import type {FC} from 'react';
import StackUtils from 'stack-utils';
import codeExcerpt, {ExcerptLine} from 'code-excerpt';
import Box from './Box';
import Text from './Text';

const stackUtils = new StackUtils({
	cwd: process.cwd(),
	internals: StackUtils.nodeInternals()
});

interface Props {
	readonly error: Error;
}

const ErrorOverview: FC<Props> = ({error}) => {
	const stack = error.stack ? error.stack.split('\n').slice(1) : undefined;
	const origin = stack ? stackUtils.parseLine(stack[0]) : undefined;
	let excerpt: ExcerptLine[] | undefined;
	let lineWidth = 0;

	if (origin?.file && origin?.line && fs.existsSync(origin.file)) {
		const sourceCode = fs.readFileSync(origin.file, 'utf8');
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

			{origin && (
				<Box marginTop={1}>
					<Text dimColor>
						{origin.file}:{origin.line}:{origin.column}
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
							const parsedLine = stackUtils.parseLine(line)!;

							return (
								<Box key={line}>
									<Text dimColor>- </Text>
									<Text dimColor bold>
										{parsedLine.function}
									</Text>
									<Text dimColor color="gray">
										{' '}
										({parsedLine.file}:{parsedLine.line}:{parsedLine.column})
									</Text>
								</Box>
							);
						})}
				</Box>
			)}
		</Box>
	);
};

export default ErrorOverview;
