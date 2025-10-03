import React, {useState, useEffect} from 'react';
import {
	render,
	Text,
	Box,
	useApp,
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
};

async function loadTranslations(locale: string): Promise<TranslationData> {
	try {
		const {default: translations} = (await import(`./locales/${locale}.json`, {
			with: {type: 'json'},
		})) as {default: TranslationData};
		return translations;
	} catch {
		const {default: translations} = (await import('./locales/en.json', {
			with: {type: 'json'},
		})) as {
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
	const {exit} = useApp();

	useEffect(() => {
		const loadData = async () => {
			const result = await loadTranslations(locale);
			setTranslations(result);
		};

		void loadData();
	}, [locale]);

	// Auto-switch language every 1.5 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			setLocale(previous => (previous === 'en' ? 'zh' : 'en'));
		}, 1500);

		return () => {
			clearInterval(interval);
		};
	}, []);

	// Auto-exit after 4 seconds
	useEffect(() => {
		const timeout = setTimeout(() => {
			exit();
		}, 4000);

		return () => {
			clearTimeout(timeout);
		};
	}, [exit]);

	if (!translations) {
		return <Text>Loading translations...</Text>;
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Box flexDirection="column" alignItems="center" gap={1}>
					{/* Example 1: composeTextFragments for i18n */}
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

					{/* Example 2: renderStyledText for i18n */}
					{renderStyledText(translations.description.message, {
						fragmentedSentence: (
							<Text underline color="yellow">
								{translations.terms.fragmentedSentence}
							</Text>
						),
					})}

					{/* Language indicator */}
					<Text dimColor>Language: {locale === 'en' ? 'English' : '中文'}</Text>
				</Box>
			</Box>
		</Box>
	);
}

render(<StyleShowcaseI18n />);
