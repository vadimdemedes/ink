import {serial as test} from 'ava';
import {spawn} from 'node-pty';

test.cb('exit when user types "q" character', t => {
	const term = spawn('node', ['./fixtures/run', './handles-user-input'], {
		name: 'xterm-color',
		cols: 100,
		cwd: __dirname,
		env: process.env
	});

	let output = '';

	term.on('data', data => {
		output += data;
	});

	let isExited = false;

	term.on('exit', code => {
		isExited = true;

		if (code === 0) {
			t.true(output.includes('exited'));
			t.pass();
			t.end();
			return;
		}

		t.fail();
		t.end();
	});

	setTimeout(() => {
		t.false(isExited);
		term.write('q');
	}, 1000);

	setTimeout(() => {
		term.kill();
		t.fail();
		t.end();
	}, 1500);
});
