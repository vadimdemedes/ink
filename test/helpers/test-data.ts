const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const randomChar = () => {
	return chars.charAt(Math.floor(Math.random() * chars.length));
};

export const randomStringOfLength = (n: number): string => {
	return Array.from({length: n})
		.map(() => randomChar())
		.join('');
};
