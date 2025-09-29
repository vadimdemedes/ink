import React from 'react';
import {render, Text, Box, composeTextFragments} from '../../src/index.js';
import {buildStyleLine, parseTranslation} from './i18n-utils.js';
import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

function StyleShowcaseStatic() {
	// 英文版本
	const englishFragments = [
		...buildStyleLine(enTranslations.styles.colors),
		...buildStyleLine(enTranslations.styles.backgrounds),
		...buildStyleLine(enTranslations.styles.decorations),
		...buildStyleLine(enTranslations.styles.combinations),
	];

	// 中文版本
	const chineseFragments = [
		...buildStyleLine(zhTranslations.styles.colors),
		...buildStyleLine(zhTranslations.styles.backgrounds),
		...buildStyleLine(zhTranslations.styles.decorations),
		...buildStyleLine(zhTranslations.styles.combinations),
	];

	const englishText = composeTextFragments(englishFragments);
	const chineseText = composeTextFragments(chineseFragments);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text bold color="cyan">
					{composeTextFragments([parseTranslation(enTranslations.header.title)])}
				</Text>
			</Box>

			<Box height={1} />

			{/* English Section */}
			<Box borderStyle="single" borderColor="green" padding={1}>
				<Box flexDirection="column">
					<Text bold underline color="green">
						{enTranslations.sections.english}
					</Text>
					<Text> </Text>
					<Text>{englishText}</Text>
				</Box>
			</Box>

			<Box height={1} />

			{/* Chinese Section */}
			<Box borderStyle="single" borderColor="yellow" padding={1}>
				<Box flexDirection="column">
					<Text bold underline color="yellow">
						{zhTranslations.sections.chinese}
					</Text>
					<Text> </Text>
					<Text>{chineseText}</Text>
				</Box>
			</Box>

			<Box height={1} />

			{/* Footer */}
			<Box justifyContent="center">
				<Text dimColor>
					{composeTextFragments([parseTranslation(enTranslations.footer.message)])}
				</Text>
			</Box>
		</Box>
	);
}

render(<StyleShowcaseStatic />);