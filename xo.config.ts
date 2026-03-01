import {type FlatXoConfig} from 'xo';

const xoConfig: FlatXoConfig = [
	{
		ignores: ['src/parse-keypress.ts'],
	},
	{
		react: true,
		prettier: true,
		semicolon: true,
		rules: {
			'react/no-unescaped-entities': 'off',
			'react/state-in-constructor': 'off',
			'react/jsx-indent': 'off',
			'react/prop-types': 'off',
			'unicorn/import-index': 'off',
			'import-x/no-useless-path-segments': 'off',
			'react-hooks/exhaustive-deps': 'off',
			complexity: 'off',
		},
	},
	{
		files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
		rules: {
			'no-unused-expressions': 'off',
			camelcase: ['error', {allow: ['^unstable__', '^internal_']}],
			'unicorn/filename-case': 'off',
			'react/default-props-match-prop-types': 'off',
			'unicorn/prevent-abbreviations': 'off',
			'react/require-default-props': 'off',
			'react/jsx-curly-brace-presence': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/promise-function-async': 'warn',
			'@typescript-eslint/explicit-function-return': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'dot-notation': 'off',
			'react/boolean-prop-naming': 'off',
			'unicorn/prefer-dom-node-remove': 'off',
			'unicorn/prefer-event-target': 'off',
			'unicorn/consistent-existence-index-check': 'off',
			'unicorn/prefer-string-raw': 'off',
			'n/prefer-global/buffer': 'off',
			'promise/prefer-await-to-then': 'off',
		},
	},
	{
		files: ['examples/**/*.{ts,tsx}', 'benchmark/**/*.{ts,tsx}'],
		rules: {
			'import-x/no-unassigned-import': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
			'n/prefer-global/buffer': 'off',
		},
	},
];

export default xoConfig;
