import EventEmitter from 'node:events';
import React, {useEffect} from 'react';
import delay from 'delay';
import test from 'ava';
import {spy, stub} from 'sinon';
import {render, Box, Text, useFocus, useFocusManager} from '../src/index.js';
import createStdout from './helpers/create-stdout.js';

const createStdin = () => {
	const stdin = new EventEmitter() as unknown as NodeJS.WriteStream;
	stdin.isTTY = true;
	stdin.setRawMode = spy();
	stdin.setEncoding = () => {};
	stdin.read = stub();
	stdin.unref = () => {};
	stdin.ref = () => {};

	return stdin;
};

const emitReadable = (stdin: NodeJS.WriteStream, chunk: string) => {
	/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
	const read = stdin.read as ReturnType<typeof stub>;
	read.onCall(0).returns(chunk);
	read.onCall(1).returns(null);
	stdin.emit('readable');
	read.reset();
	/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
};

type TestProps = {
	readonly showFirst?: boolean;
	readonly disableFirst?: boolean;
	readonly disableSecond?: boolean;
	readonly disableThird?: boolean;
	readonly autoFocus?: boolean;
	readonly disabled?: boolean;
	readonly focusNext?: boolean;
	readonly focusPrevious?: boolean;
	readonly unmountChildren?: boolean;
};

function Test({
	showFirst = true,
	disableFirst = false,
	disableSecond = false,
	disableThird = false,
	autoFocus = false,
	disabled = false,
	focusNext = false,
	focusPrevious = false,
	unmountChildren = false,
}: TestProps) {
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

	if (unmountChildren) {
		return null;
	}

	return (
		<Box flexDirection="column">
			{showFirst && (
				<Item label="First" autoFocus={autoFocus} disabled={disableFirst} />
			)}
			<Item label="Second" autoFocus={autoFocus} disabled={disableSecond} />
			<Item label="Third" autoFocus={autoFocus} disabled={disableThird} />
		</Box>
	);
}

type ItemProps = {
	readonly label: string;
	readonly autoFocus: boolean;
	readonly disabled?: boolean;
};

function Item({label, autoFocus, disabled = false}: ItemProps) {
	const {isFocused} = useFocus({
		autoFocus,
		isActive: !disabled,
	});

	return (
		<Text>
			{label} {isFocused && '✔'}
		</Text>
	);
}

test('dont focus on register when auto focus is off', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third'].join('\n'),
	);
});

test('focus the first component to register', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('unfocus active component on Esc', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\u001B');
	await delay(100);
	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third'].join('\n'),
	);
});

test('switch focus to first component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('switch focus to the next component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});

test('switch focus to the first component if currently focused component is the last one on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);

	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('skip disabled component on Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableSecond />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('switch focus to the previous component on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);

	emitReadable(stdin, '\u001B[Z');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('switch focus to the last component if currently focused component is the first one on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\u001B[Z');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('skip disabled component on Shift+Tab', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableSecond />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\u001B[Z');
	emitReadable(stdin, '\u001B[Z');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('reset focus when focused component unregisters', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], ['Second', 'Third'].join('\n'));
});

test('focus first component after focused component unregisters', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], ['Second', 'Third'].join('\n'));

	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['Second ✔', 'Third'].join('\n'),
	);
});

test('toggle focus management', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test autoFocus disabled />);
	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);

	rerender(<Test autoFocus />);
	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});

test('manually focus next component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test autoFocus focusNext />);
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});

test('manually focus previous component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test autoFocus focusPrevious />);
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('doesnt crash when focusing next on unmounted children', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test focusNext unmountChildren />);
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], '');
});

test('doesnt crash when focusing previous on unmounted children', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	rerender(<Test focusPrevious unmountChildren />);
	await delay(100);

	t.is((stdout.write as any).lastCall.args[0], '');
});

test('focuses first non-disabled component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableFirst disableSecond />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('skips disabled elements when wrapping around', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableFirst />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);
	emitReadable(stdin, '\t');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});

test('skips disabled elements when wrapping around from the front', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableThird />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(100);
	emitReadable(stdin, '\u001B[Z');
	await delay(100);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});
