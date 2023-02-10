import chalk from 'chalk';

type ColorType = 'foreground' | 'background';

// eslint-disable-next-line @typescript-eslint/naming-convention
const RGB_LIKE_REGEX = /^rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)$/;
// eslint-disable-next-line @typescript-eslint/naming-convention
const ANSI_REGEX = /^ansi256\(\s?(\d+)\s?\)$/;

const getMethod = (name: string, type: ColorType): string => {
	if (type === 'foreground') {
		return name;
	}

	return 'bg' + name[0]!.toUpperCase() + name.slice(1);
};

const colorize = (
	str: string,
	color: string | undefined,
	type: ColorType
): string => {
	if (!color) {
		return str;
	}

	if (color in chalk) {
		const method = getMethod(color, type);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (chalk as any)[method](str);
	}

	if (color.startsWith('#')) {
		const method = getMethod('hex', type);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (chalk as any)[method](color)(str);
	}

	if (color.startsWith('ansi256')) {
		const matches = ANSI_REGEX.exec(color);

		if (!matches) {
			return str;
		}

		const method = getMethod(matches[1]!, type);
		const value = Number(matches[2]);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (chalk as any)[method](value)(str);
	}

	if (color.startsWith('rgb')) {
		const matches = RGB_LIKE_REGEX.exec(color);

		if (!matches) {
			return str;
		}

		const method = getMethod(matches[1]!, type);
		const firstValue = Number(matches[2]);
		const secondValue = Number(matches[3]);
		const thirdValue = Number(matches[4]);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return (chalk as any)[method](firstValue, secondValue, thirdValue)(str);
	}

	return str;
};

export default colorize;
