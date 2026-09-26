export const countOfCharIn = ({
	text,
	char,
	start = 0,
	end = text.length,
}: {
	text: string;
	char: string;
	start?: number;
	end?: number;
}) => {
	if (text.length === 0) return 0;

	let count = 0;
	--start;
	while (true) {
		start = text.indexOf(char, start + 1);
		if (start === -1 || start >= end) {
			return count;
		}

		++count;
	}
};
