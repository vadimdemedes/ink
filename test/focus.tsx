import EventEmitter from 'node:events';
import React, {act, useEffect} from 'react';
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
	const {
		enableFocus,
		disableFocus,
		focusNext: doFocusNext,
		focusPrevious: doFocusPrevious,
	} = useFocusManager();

	useEffect(() => {
		if (disabled) {
			disableFocus();
		} else {
			enableFocus();
		}
	}, [disabled, disableFocus, enableFocus]);

	useEffect(() => {
		if (focusNext) {
			doFocusNext();
		}
	}, [focusNext, doFocusNext]);

	useEffect(() => {
		if (focusPrevious) {
			doFocusPrevious();
		}
	}, [focusPrevious, doFocusPrevious]);

	if (unmountChildren) {
		return null;
	}

	return (
		<Box flexDirection="column">
			{showFirst ? (
				<Item label="First" autoFocus={autoFocus} disabled={disableFirst} />
			) : null}
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
			{label} {isFocused ? '✔' : null}
		</Text>
	);
}

for (const [name, input, expected] of [
	['Tab', '\u001B[9u', ['First', 'Second ✔', 'Third']],
	['Shift+Tab', '\u001B[9;2u', ['First', 'Second', 'Third ✔']],
	['Tab repeat', '\u001B[9;1:2u', ['First', 'Second ✔', 'Third']],
	['Tab release', '\u001B[9;1:3u', ['First ✔', 'Second', 'Third']],
	['Ctrl+Tab', '\u001B[9;5u', ['First ✔', 'Second', 'Third']],
	['Alt+Tab', '\u001B[9;3u', ['First ✔', 'Second', 'Third']],
	['Super+Tab', '\u001B[9;9u', ['First ✔', 'Second', 'Third']],
	['Hyper+Tab', '\u001B[9;17u', ['First ✔', 'Second', 'Third']],
	['Escape', '\u001B[27u', ['First', 'Second', 'Third']],
	['Escape repeat', '\u001B[27;1:2u', ['First', 'Second', 'Third']],
	['Escape release', '\u001B[27;1:3u', ['First ✔', 'Second', 'Third']],
	['Shift+Escape', '\u001B[27;2u', ['First ✔', 'Second', 'Third']],
	['Ctrl+Escape', '\u001B[27;5u', ['First ✔', 'Second', 'Third']],
	['Alt+Escape', '\u001B[27;3u', ['First ✔', 'Second', 'Third']],
	['Super+Escape', '\u001B[27;9u', ['First ✔', 'Second', 'Third']],
	['Hyper+Escape', '\u001B[27;17u', ['First ✔', 'Second', 'Third']],
] as const) {
	test(`focus navigation handles kitty ${name}`, async t => {
		const stdout = createStdout();
		const stdin = createStdin();
		let instance!: ReturnType<typeof render>;
		await act(async () => {
			instance = render(<Test autoFocus />, {
				stdout,
				stdin,
				debug: true,
				concurrent: true,
			});
		});
		t.teardown(async () => {
			await act(async () => {
				instance.unmount();
			});
		});
		t.is(stdout.get(), ['First ✔', 'Second', 'Third'].join('\n'));

		await act(async () => {
			emitReadable(stdin, input);
		});

		t.is(stdout.get(), expected.join('\n'));
	});
}

test('do not focus on register when auto focus is off', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(50);

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

	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

test('generated focus IDs remain distinct when random values collide', async t => {
	const random = stub(Math, 'random').returns(0.123_456);
	t.teardown(() => {
		random.restore();
	});
	const stdout = createStdout();
	const stdin = createStdin();
	let instance!: ReturnType<typeof render>;

	await act(async () => {
		instance = render(<Test autoFocus />, {
			stdout,
			stdin,
			debug: true,
			concurrent: true,
		});
	});
	t.teardown(async () => {
		await act(async () => {
			instance.unmount();
		});
	});

	t.is(stdout.get(), 'First ✔\nSecond\nThird');

	await act(async () => {
		emitReadable(stdin, '\t');
	});
	t.is(stdout.get(), 'First\nSecond ✔\nThird');

	await act(async () => {
		emitReadable(stdin, '\t');
	});
	t.is(stdout.get(), 'First\nSecond\nThird ✔');
});

test('unfocus active component on Esc', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {unmount} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});
	t.teardown(unmount);

	await delay(50);
	t.is(stdout.get(), ['First ✔', 'Second', 'Third'].join('\n'));
	emitReadable(stdin, '\u001B');
	await delay(50);
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

	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\t');
	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\t');
	emitReadable(stdin, '\t');
	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);

	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);

	emitReadable(stdin, '\u001B[Z');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\u001B[Z');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\u001B[Z');
	emitReadable(stdin, '\u001B[Z');
	await delay(50);

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

	await delay(50);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(50);

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

	await delay(50);
	rerender(<Test autoFocus showFirst={false} />);
	await delay(50);

	t.is((stdout.write as any).lastCall.args[0], ['Second', 'Third'].join('\n'));

	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	t.is(stdout.get(), ['First ✔', 'Second', 'Third'].join('\n'));

	rerender(<Test autoFocus disabled />);
	await delay(50);
	t.is(stdout.get(), ['First', 'Second', 'Third'].join('\n'));

	emitReadable(stdin, '\t');
	await delay(50);

	t.is(stdout.get(), ['First', 'Second', 'Third'].join('\n'));

	rerender(<Test autoFocus />);
	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);

	t.is(stdout.get(), ['First ✔', 'Second', 'Third'].join('\n'));
});

test('new components do not auto-focus while focus management is disabled', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let disableFocus!: () => void;
	let enableFocus!: () => void;
	function Controller() {
		({disableFocus, enableFocus} = useFocusManager());
		return null;
	}

	const app = render(<Controller />, {stdout, stdin, debug: true});
	t.teardown(app.unmount);
	await app.waitUntilRenderFlush();
	disableFocus();
	await app.waitUntilRenderFlush();
	app.rerender(
		<>
			<Controller />
			<ItemWithId autoFocus id="new" label="New" />
		</>,
	);
	await app.waitUntilRenderFlush();
	t.is(stdout.get(), 'New');

	enableFocus();
	await app.waitUntilRenderFlush();
	t.is(stdout.get(), 'New');
	await act(async () => {
		emitReadable(stdin, '\t');
	});
	await app.waitUntilRenderFlush();
	t.is(stdout.get(), 'New ✔');
});

test('manually focus next component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(50);
	rerender(<Test autoFocus focusNext />);
	await delay(50);

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

	await delay(50);
	rerender(<Test autoFocus focusPrevious />);
	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('does not crash when focusing next on unmounted children', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(50);
	rerender(<Test focusNext unmountChildren />);
	await delay(50);

	t.is((stdout.write as any).lastCall.args[0], '');
});

test('does not crash when focusing previous on unmounted children', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender} = render(<Test autoFocus />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(50);
	rerender(<Test focusPrevious unmountChildren />);
	await delay(50);

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

	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third ✔'].join('\n'),
	);
});

test('changing autoFocus does not reactivate disabled components', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {rerender, unmount} = render(<Test disableFirst />, {
		stdout,
		stdin,
		debug: true,
	});
	t.teardown(unmount);

	await delay(50);
	t.is(stdout.get(), 'First\nSecond\nThird');

	rerender(<Test autoFocus disableFirst />);
	await delay(50);
	t.is(stdout.get(), 'First\nSecond ✔\nThird');

	emitReadable(stdin, '\u001B[Z');
	await delay(50);
	t.is(stdout.get(), 'First\nSecond\nThird ✔');

	rerender(<Test disableFirst />);
	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);
	t.is(stdout.get(), 'First\nSecond ✔\nThird');
});

test('skips disabled elements when wrapping around', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	render(<Test autoFocus disableFirst />, {
		stdout,
		stdin,
		debug: true,
	});

	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);

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

	await delay(50);
	emitReadable(stdin, '\u001B[Z');
	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second ✔', 'Third'].join('\n'),
	);
});

// Concurrent mode tests
// Note: Focus tests with stdin interaction are complex to migrate.
// These tests verify basic concurrent rendering with focus components.
test('focus component renders in concurrent mode', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {act} = await import('react');

	await act(async () => {
		render(<Test />, {
			stdout,
			stdin,
			debug: true,
			concurrent: true,
		});
	});

	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First', 'Second', 'Third'].join('\n'),
	);
});

test('focus component with autoFocus renders in concurrent mode', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	const {act} = await import('react');

	await act(async () => {
		render(<Test autoFocus />, {
			stdout,
			stdin,
			debug: true,
			concurrent: true,
		});
	});

	await delay(50);

	t.is(
		(stdout.write as any).lastCall.args[0],
		['First ✔', 'Second', 'Third'].join('\n'),
	);
});

function ItemWithId({
	label,
	id,
	autoFocus = false,
	isActive = true,
}: {
	readonly label: string;
	readonly id: string;
	readonly autoFocus?: boolean;
	readonly isActive?: boolean;
}) {
	const {isFocused} = useFocus({id, autoFocus, isActive});
	return (
		<Text>
			{label} {isFocused ? '✔' : null}
		</Text>
	);
}

function ActiveIdReader({
	onActiveId,
}: {
	readonly onActiveId: (id: string | undefined) => void;
}) {
	const {activeId} = useFocusManager();
	onActiveId(activeId);
	return null;
}

test('activeId from useFocusManager reflects currently focused component', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let capturedActiveId: string | undefined;

	render(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<ItemWithId label="First" id="first" />
			<ItemWithId label="Second" id="second" />
		</Box>,
		{stdout, stdin, debug: true},
	);

	await delay(50);
	t.is(capturedActiveId, undefined);

	emitReadable(stdin, '\t');
	await delay(50);
	t.is(capturedActiveId, 'first');

	emitReadable(stdin, '\t');
	await delay(50);
	t.is(capturedActiveId, 'second');
});

test('activeId resets to undefined on Esc', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let capturedActiveId: string | undefined;

	render(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<ItemWithId label="First" id="first" />
		</Box>,
		{stdout, stdin, debug: true},
	);

	await delay(50);
	emitReadable(stdin, '\t');
	await delay(50);
	t.is(capturedActiveId, 'first');

	emitReadable(stdin, '\u001B');
	await delay(50);
	t.is(capturedActiveId, undefined);
});

test('activeId is set immediately when component uses autoFocus', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let capturedActiveId: string | undefined;

	render(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<ItemWithId autoFocus label="First" id="first" />
			<ItemWithId label="Second" id="second" />
		</Box>,
		{stdout, stdin, debug: true},
	);

	await delay(50);
	t.is(capturedActiveId, 'first');
});

test('activeId updates when focus is changed programmatically', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let capturedActiveId: string | undefined;
	let capturedFocus: ((id: string) => void) | undefined;

	function FocusCapture() {
		const {focus} = useFocusManager();
		capturedFocus = focus;
		return null;
	}

	render(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<FocusCapture />
			<ItemWithId label="First" id="first" />
			<ItemWithId label="Second" id="second" />
		</Box>,
		{stdout, stdin, debug: true},
	);

	await delay(50);
	t.is(capturedActiveId, undefined);

	capturedFocus!('second');
	await delay(50);
	t.is(capturedActiveId, 'second');

	capturedFocus!('first');
	await delay(50);
	t.is(capturedActiveId, 'first');
});

test('programmatic focus skips inactive components until they are re-enabled', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let focus: (id: string) => void;

	function Example({isActive = false}: {readonly isActive?: boolean}) {
		({focus} = useFocusManager());

		return (
			<Box flexDirection="column">
				<ItemWithId autoFocus label="First" id="first" />
				<ItemWithId label="Second" id="second" isActive={isActive} />
			</Box>
		);
	}

	const {rerender, unmount} = render(<Example />, {stdout, stdin, debug: true});
	t.teardown(unmount);

	await delay(50);
	t.is(stdout.get(), 'First ✔\nSecond');

	focus!('second');
	await delay(50);
	t.is(stdout.get(), 'First ✔\nSecond');

	rerender(<Example isActive />);
	await delay(50);
	focus!('second');
	await delay(50);
	t.is(stdout.get(), 'First\nSecond ✔');
});

test('activeId resets to undefined when focused component unmounts', async t => {
	const stdout = createStdout();
	const stdin = createStdin();
	let capturedActiveId: string | undefined;

	const {rerender} = render(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<ItemWithId autoFocus label="First" id="first" />
			<ItemWithId label="Second" id="second" />
		</Box>,
		{stdout, stdin, debug: true},
	);

	await delay(50);
	t.is(capturedActiveId, 'first');

	rerender(
		<Box flexDirection="column">
			<ActiveIdReader
				onActiveId={id => {
					capturedActiveId = id;
				}}
			/>
			<ItemWithId label="Second" id="second" />
		</Box>,
	);

	await delay(50);
	t.is(capturedActiveId, undefined);
});
