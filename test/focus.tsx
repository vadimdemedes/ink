import EventEmitter from 'events';
import React, {useEffect} from 'react';
import type {FC} from 'react';
import delay from 'delay';
import test from 'ava';
import {spy} from 'sinon';
import {render, Box, Text, useFocus, useFocusManager} from '..';
import createStdout from './helpers/create-stdout';

const createStdin = () => {
	const stdin = new EventEmitter();
	stdin.isTTY = true;
	stdin.setRawMode = spy();
	stdin.setEncoding = () => {};
	stdin.resume = () => {};

	return stdin;
};

interface TestProps {
	showFirst?: boolean;
	disableSecond?: boolean;
	autoFocus?: boolean;
	disabled?: boolean;
	focusNext?: boolean;
	focusPrevious?: boolean;
}

const Test: FC<TestProps> = ({
	showFirst = true,
	disableSecond = false,
	autoFocus = false,
	disabled = false,
	focusNext = false,
	focusPrevious = false
}) => {
	const focusManager = useFocusManager();

	useEffect(() => {
		if (disabled) {
			focusManager.disableFocus();
		} else {
			focusManager.enableFocus();
		}
	}, [disabled]);

	useEffect(() => {
		if (focusNext) {
			focusManager.focusNext();
		}
	}, [focusNext]);

	useEffect(() => {
		if (focusPrevious) {
			focusManager.focusPrevious();
		}
	}, [focusPrevious]);

	return (
		<Box flexDirection="column">
			{showFirst && <Item label="First" autoFocus={autoFocus} />}
			<Item label="Second" autoFocus={autoFocus} disabled={disableSecond} />
			<Item label="Third" autoFocus={autoFocus} />
		</Box>
	);
};

interface ItemProps {
	label: string;
	autoFocus: boolean;
	disabled?: boolean;
}

const Item: FC<ItemProps> = ({label, autoFocus, disabled = false}) => {
	const {isFocused} = useFocus({
		autoFocus,
		isActive: !disabled
	});

	return (
		<Text>
			{label} {isFocused && '✔'}
		</Text>
	);
};

test('dont focus on register when auto focus is off', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);

	t.is(stdout.write.lastCall.args[0], ['First', 'Second', 'Third'].join('\n'));
});

test('focus the first component to register', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);
});

test('unfocus active component on Esc', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\u001B');
	await delay(100);
	t.is(stdout.write.lastCall.args[0], ['First', 'Second', 'Third'].join('\n'));
});

test('switch focus to first component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);
});

test('switch focus to the next component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\t');
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n')
	);
});

test('switch focus to the first component if currently focused component is the last one on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\t');
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n')
	);

	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);
});

test('skip disabled component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableSecond />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n')
	);
});

test('switch focus to the previous component on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n')
	);

	stdin.emit('data', '\u001B[Z');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);
});

test('switch focus to the last component if currently focused component is the first one on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\u001B[Z');

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n')
	);
});

test('skip disabled component on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableSecond />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	stdin.emit('data', '\u001B[Z');
	stdin.emit('data', '\u001B[Z');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);
});

test('reset focus when focused component unregisters', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(100);

	t.is(stdout.write.lastCall.args[0], ['Second', 'Third'].join('\n'));
});

test('focus first component after focused component unregisters', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(100);

	t.is(stdout.write.lastCall.args[0], ['Second', 'Third'].join('\n'));

	stdin.emit('data', '\t');
	await delay(100);

	t.is(stdout.write.lastCall.args[0], ['Second ✔', 'Third'].join('\n'));
});

test('toggle focus management', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	rerender(<Test autoFocus disabled />);
	await delay(100);
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n')
	);

	rerender(<Test autoFocus />);
	await delay(100);
	stdin.emit('data', '\t');
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n')
	);
});

test('manually focus next component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	rerender(<Test autoFocus focusNext />);
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n')
	);
});

test('manually focus previous component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true
	});

	await delay(100);
	rerender(<Test autoFocus focusPrevious />);
	await delay(100);

	t.is(
		stdout.write.lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n')
	);
});
