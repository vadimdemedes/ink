import eslintConfigXoReact from 'eslint-config-xo-react';
import {type FlatXoConfig} from 'xo';

const xoConfig: FlatXoConfig = [
	{
		ignores: ['src/parse-keypress.ts'],
	},
	...eslintConfigXoReact({prettier: true}),
	{
		prettier: true,
		semicolon: true,
		rules: {
			'react/no-unescaped-entities': 'off',
			'unicorn/import-index': 'off',
			'import-x/no-useless-path-segments': 'off',
			complexity: 'off',
			'@typescript-eslint/no-unsafe-type-assertion': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/strict-void-return': 'off',
			'require-unicode-regexp': 'off',
			'unicorn/no-immediate-mutation': 'off',
			'unicorn/no-array-reverse': 'off',
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/refs': 'off',
			'react-hooks/globals': 'off',
			'react-hooks/component-hook': 'off',
			'@stylistic/curly-newline': 'off',
			'node-test/no-conditional-assertion': 'off',
			// The test script only runs `test/*.{ts,tsx}`, so the files in `test/helpers` and `test/fixtures` are never run as tests.
			'node-test/no-import-test-files': 'off',
			// Ink has its own `aria-*` props and `autoFocus` for terminal focus, not the DOM ones.
			'jsx-a11y-x/aria-props': 'off',
			'jsx-a11y-x/no-autofocus': 'off',
			// Conflicts with Prettier, which removes the parentheses this rule asks for.
			'@stylistic/no-mixed-operators': 'off',
			'max-depth': 'off',
			'max-lines': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			// Layout output can change between `yoga-layout` minor versions.
			'package-json/dependency-version-range': [
				'error',
				{
					exceptions: ['yoga-layout'],
				},
			],
		},
	},
	{
		files: ['test/**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-floating-promises': [
				'error',
				{
					checkThenables: true,
					// eslint-disable-next-line @typescript-eslint/naming-convention -- Option name from typescript-eslint.
					ignoreIIFE: true,
					allowForKnownSafeCalls: [
						{
							from: 'package',
							name: ['test', 'todo', 'before', 'after'],
							package: 'node:test',
						},
					],
				},
			],
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
		},
	},
	{
		files: [
			'examples/**/*.{ts,tsx}',
			'benchmark/**/*.{ts,tsx}',
			'media/**/*.{ts,tsx}',
		],
		rules: {
			'import-x/no-unassigned-import': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/restrict-plus-operands': 'off',
		},
	},
];

export default xoConfig;
