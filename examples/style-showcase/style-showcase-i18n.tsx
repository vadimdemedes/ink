import React, {useState, useEffect} from 'react';
import {
	render,
	Text,
	Box,
	useInput,
	composeTextFragments,
} from '../../src/index.js';
import {renderStyledText} from './render-styled-text.js';

type TranslationData = {
	header: {
		title: {
			prefix: string;
			api: string;
			suffix: string;
		};
	};
	description: {
		message: string;
	};
	terms: {
		fragmentedSentence: string;
	};
	controls: {
		message: string;
	};
};

async function loadTranslations(locale: string): Promise<TranslationData> {
	try {
		const {default: translations} = (await import(
			`./locales/${locale}.json`
		)) as {default: TranslationData};
		return translations;
	} catch {
		const {default: translations} = (await import('./locales/en.json')) as {
			default: TranslationData;
		};
		return translations;
	}
}

function StyleShowcaseI18n() {
	const [locale, setLocale] = useState<'en' | 'zh'>('en');
	const [translations, setTranslations] = useState<TranslationData | undefined>(
		undefined,
	);

	useEffect(() => {
		const loadData = async () => {
			const result = await loadTranslations(locale);
			setTranslations(result);
		};

		void loadData();
	}, [locale]);

	useInput(input => {
		if (input === 'l' || input === 'L') {
			setLocale(previous => (previous === 'en' ? 'zh' : 'en'));
		}
	});

	if (!translations) {
		return <Text>Loading translations...</Text>;
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Box flexDirection="column" alignItems="center">
					<Text bold>
						{composeTextFragments([
							{
								text: translations.header.title.prefix,
								styles: [{color: 'red'}],
							},
							{
								text: translations.header.title.api,
								styles: [{color: 'yellow'}, {underline: true}],
							},
							{
								text: translations.header.title.suffix,
								styles: [{color: 'red'}],
							},
						])}
					</Text>
					{renderStyledText(translations.description.message, {
						fragmentedSentence: (
							<Text underline color="yellow">
								{translations.terms.fragmentedSentence}
							</Text>
						),
					})}
				</Box>
			</Box>

			<Box height={1} />

			{/* Controls */}
			<Box justifyContent="center">
				<Text dimColor>{translations.controls.message}</Text>
			</Box>
		</Box>
	);
}

render(<StyleShowcaseI18n />);
