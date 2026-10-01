import chalk, {
	foregroundColorNames,
	type ForegroundColorName,
	type BackgroundColorName,
} from 'chalk';

type ColorType = 'foreground' | 'background';

const rgbRegex =
	/^rgb\(\s*(?<red>\d+)\s*,\s*(?<green>\d+)\s*,\s*(?<blue>\d+)\s*\)$/;
const ansiRegex = /^ansi256\(\s?(?<value>\d+)\s?\)$/;

const isNamedColor = (color: string): color is ForegroundColorName =>
	foregroundColorNames.includes(color as ForegroundColorName);

const colorize = (
	text: string,
	color: string | undefined,
	type: ColorType,
): string => {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- JavaScript callers pass `null` or `false` (for example `condition && 'red'`), and any falsy value means unset.
	if (!color) {
		return text;
	}

	if (isNamedColor(color)) {
		if (type === 'foreground') {
			return chalk[color](text);
		}

		const methodName = `bg${
			color[0]!.toUpperCase() + color.slice(1)
		}` as BackgroundColorName;

		return chalk[methodName](text);
	}

	if (color.startsWith('#')) {
		return type === 'foreground'
			? chalk.hex(color)(text)
			: chalk.bgHex(color)(text);
	}

	if (color.startsWith('ansi256')) {
		const matches = ansiRegex.exec(color);

		if (!matches) {
			return text;
		}

		const value = Number(matches.groups!['value']);

		return type === 'foreground'
			? chalk.ansi256(value)(text)
			: chalk.bgAnsi256(value)(text);
	}

	if (color.startsWith('rgb')) {
		const matches = rgbRegex.exec(color);

		if (!matches) {
			return text;
		}

		const {red, green, blue} = matches.groups!;
		const firstValue = Number(red);
		const secondValue = Number(green);
		const thirdValue = Number(blue);

		return type === 'foreground'
			? chalk.rgb(firstValue, secondValue, thirdValue)(text)
			: chalk.bgRgb(firstValue, secondValue, thirdValue)(text);
	}

	return text;
};

export default colorize;
