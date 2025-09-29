import React, {useState, useEffect} from 'react';
import {render, Text, Box, useInput, composeTextFragments} from '../../src/index.js';

type TranslationData = {
	header: {
		title: {
			prefix: string;
			api: string;
			suffix: string;
		};
	};
	controls: {
		message: string;
	};
};

async function loadTranslations(locale: string): Promise<TranslationData> {
	try {
		const {default: translations} = await import(`./locales/${locale}.json`);
		return translations;
	} catch {
		const {default: translations} = await import('./locales/en.json');
		return translations;
	}
}

function StyleShowcaseI18n() {
	const [locale, setLocale] = useState<'en' | 'zh'>('en');
	const [translations, setTranslations] = useState<TranslationData | null>(null);

	useEffect(() => {
		loadTranslations(locale).then(setTranslations);
	}, [locale]);

	useInput((input) => {
		if (input === 'l' || input === 'L') {
			setLocale(prev => (prev === 'en' ? 'zh' : 'en'));
		}
	});

	if (!translations) {
		return <Text>Loading translations...</Text>;
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="cyan" padding={1}>
				<Text bold>
					{composeTextFragments([
						{text: translations.header.title.prefix, styles: [{color: 'red'}]},
						{text: translations.header.title.api, styles: [{color: 'yellow'}, {underline: true}]},
						{text: translations.header.title.suffix, styles: [{color: 'red'}]}
					])}
				</Text>
			</Box>

			<Box height={1} />
			
			<Box justifyContent="center">
				<Text dimColor>
					{translations.controls.message}
				</Text>
			</Box>

		</Box>
	);
}

render(<StyleShowcaseI18n />);