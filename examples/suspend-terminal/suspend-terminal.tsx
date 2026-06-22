import process from 'node:process';
import {spawn} from 'node:child_process';
import React, {useState} from 'react';
import {render, Text, Box, useApp, useInput} from '../../src/index.js';

const runChild = async (command: string, args: string[]): Promise<void> =>
	new Promise((resolve, reject) => {
		// With stdio: 'inherit' the child takes full ownership of the terminal, which
		// is exactly why Ink must release it via suspendTerminal first.
		const child = spawn(command, args, {stdio: 'inherit'});
		child.on('exit', () => {
			resolve();
		});
		child.on('error', reject);
	});

function Example() {
	const {suspendTerminal, exit} = useApp();
	const [counter, setCounter] = useState(0);
	const [status, setStatus] = useState('ready');

	useInput(input => {
		if (input === 'q') {
			exit();
			return;
		}

		if (input === '+') {
			setCounter(value => value + 1);
			return;
		}

		if (input === 'e' || input === 'r') {
			void (async () => {
				setStatus('suspended — child owns the terminal');

				try {
					await suspendTerminal(async () => {
						if (input === 'e') {
							const editor = process.env.EDITOR ?? 'vi';
							await runChild(editor, []);
						} else {
							await runChild('sh', [
								'-c',
								String.raw`printf "Child process owns the terminal.\nType something and press Enter: "; read -r line; printf "You typed: %s\n" "$line"`,
							]);
						}
					});

					setStatus('resumed — Ink redrew and the counter is preserved');
				} catch (error) {
					setStatus(`child failed: ${(error as Error).message}`);
				}
			})();
		}
	});

	return (
		<Box flexDirection="column" borderStyle="round" paddingX={1}>
			<Text bold>suspendTerminal() demo</Text>
			<Text>
				Counter: <Text color="green">{counter}</Text>
			</Text>
			<Text dimColor>{status}</Text>
			<Box marginTop={1} flexDirection="column">
				<Text>e — open $EDITOR (defaults to vi)</Text>
				<Text>r — run a shell read prompt</Text>
				<Text>+ — increment the counter</Text>
				<Text>q — quit</Text>
			</Box>
		</Box>
	);
}

render(<Example />);
