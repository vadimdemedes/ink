import process from 'node:process';
import {Buffer} from 'node:buffer';
import childProcess from 'node:child_process';
import {PassThrough} from 'node:stream';
import {stub} from 'sinon';
import instances from '../../src/instances.js';

const stdout = new PassThrough();
const subprocess = Object.assign(new childProcess.ChildProcess(), {
	stdin: new PassThrough(),
	stdout,
	stderr: new PassThrough(),
});
stub(childProcess, 'spawn').returns(subprocess);

await import('../../examples/subprocess-output/subprocess-output.js');
const instance = instances.get(process.stdout)!;
await instance.waitUntilRenderFlush();
const chunksByScenario: Record<string, Array<string | Uint8Array>> = {
	unicode: [...Buffer.from('한🙂')].map(byte => Buffer.from([byte])),
	ansi: ['\u001B[3', '1mRed\u001B[0', 'm text'],
	error: [],
	lines: ['one\ntwo\nthree\nfour\nfi', 've\nsix'],
};
const chunks = chunksByScenario[process.argv[2] ?? 'lines']!;

if (process.argv[2] === 'error') {
	subprocess.emit('error', new Error('spawn npm ENOENT'));
	await instance.waitUntilRenderFlush();
}

for (const chunk of chunks) {
	stdout.write(chunk);
	// eslint-disable-next-line no-await-in-loop -- Exercise each chunk as a separate stream update.
	await instance.waitUntilRenderFlush();
}

stdout.end();
await instance.waitUntilRenderFlush();
instance.unmount();
await instance.waitUntilExit();
