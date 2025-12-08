type Options = {
	readonly indent?: string;
	readonly includeEmptyLines?: boolean;
};

export default function indentString(
	string: string,
	count = 1,
	{indent = ' ', includeEmptyLines = false}: Options = {},
): string {
	if (count === 0) return string;

	const regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;

	return string.replace(regex, indent.repeat(count));
}
