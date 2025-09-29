import type {TextFragment, InlineTextStyle} from '../../src/index.js';

// 翻译数据类型
export type TranslationData = {
	header: {title: string};
	sections: {english: string; chinese: string};
	styles: {
		colors: Record<string, string>;
		backgrounds: Record<string, string>;
		decorations: Record<string, string>;
		combinations: Record<string, string>;
	};
	footer: {message: string};
};

/**
 * 解析翻译字符串，提取文本和样式信息
 * 格式: {{text:显示文本|样式属性:值,样式属性:值}}
 */
export function parseTranslation(translationString: string): TextFragment {
	const match = translationString.match(/^\{\{text:(.+?)\|(.+?)\}\}$/);
	
	if (!match) {
		// 如果不匹配模式，返回原始字符串
		return translationString;
	}

	const [, text, styleString] = match;
	const styles: InlineTextStyle[] = [];

	if (styleString) {
		const styleEntries = styleString.split(',');
		const styleObj: InlineTextStyle = {};

		for (const entry of styleEntries) {
			const [key, value] = entry.split(':');
			const trimmedKey = key.trim() as keyof InlineTextStyle;
			const trimmedValue = value.trim();

			// 处理不同类型的样式值
			if (trimmedKey === 'color' || trimmedKey === 'backgroundColor') {
				styleObj[trimmedKey] = trimmedValue;
			} else if (
				trimmedKey === 'bold' ||
				trimmedKey === 'italic' ||
				trimmedKey === 'underline' ||
				trimmedKey === 'strikethrough' ||
				trimmedKey === 'dimColor' ||
				trimmedKey === 'inverse'
			) {
				styleObj[trimmedKey] = trimmedValue === 'true';
			}
		}

		if (Object.keys(styleObj).length > 0) {
			styles.push(styleObj);
		}
	}

	return {
		text,
		styles: styles.length > 0 ? styles : undefined,
	};
}

/**
 * 构建样式行，包含多个样式片段
 */
export function buildStyleLine(
	translations: Record<string, string>,
	separator = ' | ',
): TextFragment[] {
	const fragments: TextFragment[] = [];
	const keys = Object.keys(translations);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		fragments.push(parseTranslation(translations[key]));

		// 添加分隔符，除了最后一个元素
		if (i < keys.length - 1) {
			fragments.push(separator);
		}
	}

	fragments.push('\n');
	return fragments;
}

/**
 * 加载翻译文件
 */
export async function loadTranslations(locale: string): Promise<TranslationData> {
	try {
		// 在实际项目中，这里会从文件系统或网络加载
		const {default: translations} = await import(`./locales/${locale}.json`);
		return translations;
	} catch {
		// 回退到英文
		const {default: translations} = await import('./locales/en.json');
		return translations;
	}
}