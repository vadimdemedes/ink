import chalk from 'chalk';

type ColorType = 'foreground' | 'background';

const RGB_LIKE_REGEX = /^(rgb|hsl|hsv|hwb)\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)$/;
const ANSI_REGEX = /^(ansi|ansi256)\(\s?(\d+)\s?\)$/;

const getMethod = (name: string, type: ColorType): string => {
	if (type === 'foreground') {
		return name;
	}

	return 'bg' + name[0].toUpperCase() + name.slice(1);
};

export default (
	str: string,
	color: string | undefined,
	type: ColorType
): string => {
	if (!color) {
		return str;
	}

	if (color in chalk) {
		const method = getMethod(color, type);
		return (chalk as any)[method](str);
	}

	if (color.startsWith('#')) {
		const method = getMethod('hex', type);
		return (chalk as any)[method](color)(str);
	}

	if (color.startsWith('ansi')) {
		const matches = ANSI_REGEX.exec(color);

		if (!matches) {
			return str;
		}

		const method = getMethod(matches[1], type);
		const value = Number(matches[2]);

		return (chalk as any)[method](value)(str);
	}

	const isRgbLike =
		color.startsWith('rgb') ||
		color.startsWith('hsl') ||
		color.startsWith('hsv') ||
		color.startsWith('hwb');

	if (isRgbLike) {
		const matches = RGB_LIKE_REGEX.exec(color);

		if (!matches) {
			return str;
		}

		const method = getMethod(matches[1], type);
		const firstValue = Number(matches[2]);
		const secondValue = Number(matches[3]);
		const thirdValue = Number(matches[4]);

		return (chalk as any)[method](firstValue, secondValue, thirdValue)(str);
	}

	return str;
};
