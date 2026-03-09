import process from 'node:process';
import React from 'react';
import {render, useApp, useInput, usePaste} from '../../src/index.js';

function PasteDemo({test}: {readonly test: string | undefined}) {
	const {exit} = useApp();

	usePaste(text => {
		if (test === 'basic' && text === 'hello world') {
			exit();
			return;
		}

		if (test === 'escapeSequences' && text === 'hello\u001B[Aworld') {
			exit();
			return;
		}

		if (test === 'noUseInput' && text === 'hello') {
			exit();
		}
	});

	useInput(
		input => {
			throw new Error(
				`useInput received input during paste: ${JSON.stringify(input)}`,
			);
		},
		{isActive: test === 'noUseInput'},
	);

	React.useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	return null;
}

function MultipleHooksDemo() {
	const {exit} = useApp();
	const receivedCount = React.useRef(0);

	const onPaste = React.useCallback(
		(text: string) => {
			if (text === 'hello') {
				receivedCount.current++;
				if (receivedCount.current >= 2) {
					exit();
				}
			}
		},
		[exit],
	);

	usePaste(onPaste);
	usePaste(onPaste);

	React.useEffect(() => {
		process.stdout.write('__READY__');
	}, []);

	return null;
}

const test = process.argv[2];
const app = render(
	test === 'multipleHooks' ? <MultipleHooksDemo /> : <PasteDemo test={test} />,
);

await app.waitUntilExit();
console.log('exited');
