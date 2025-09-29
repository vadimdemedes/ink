import React, {useState, useEffect} from 'react';
import {render, Text, Box, useInput, composeTextFragments} from '../../src/index.js';
import {
	loadTranslations,
	buildStyleLine,
	parseTranslation,
	type TranslationData,
} from './i18n-utils.js';

function StyleShowcaseI18n() {
	const [locale, setLocale] = useState<'en' | 'zh'>('en');
	const [translations, setTranslations] = useState<TranslationData | null>(null);

	// 加载翻译数据
	useEffect(() => {
		loadTranslations(locale).then(setTranslations);
	}, [locale]);

	// 键盘输入处理
	useInput((input) => {
		if (input === 'l' || input === 'L') {
			setLocale(prev => (prev === 'en' ? 'zh' : 'en'));
		}
	});

	if (!translations) {
		return <Text>Loading translations...</Text>;
	}

	// 构建样式片段
	const fragments = [
		// 颜色行
		...buildStyleLine(translations.styles.colors),
		// 背景行
		...buildStyleLine(translations.styles.backgrounds),
		// 装饰行
		...buildStyleLine(translations.styles.decorations),
		// 组合样式行
		...buildStyleLine(translations.styles.combinations),
	];

	const composedText = composeTextFragments(fragments);
	const headerText = composeTextFragments([
		parseTranslation(translations.header.title)
	]);
	const footerText = composeTextFragments([
		parseTranslation(translations.footer.message)
	]);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Header */}
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text bold color="cyan">
					{headerText}
				</Text>
			</Box>

			<Box height={1} />

			{/* Main Content */}
			<Box borderStyle="single" borderColor="gray" padding={1}>
				<Box flexDirection="column">
					<Text bold underline>
						{translations.sections[locale]}
					</Text>
					<Text> </Text>
					<Text>{composedText}</Text>
					<Text> </Text>
					<Text dimColor>{footerText}</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box height={1} />
			<Box justifyContent="center">
				<Text dimColor>
					Current: {locale.toUpperCase()} | Press [L] to switch language | [Ctrl+C] to exit
				</Text>
			</Box>
		</Box>
	);
}

render(<StyleShowcaseI18n />);