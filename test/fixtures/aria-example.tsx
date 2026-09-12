import process from 'node:process';
import {stub} from 'sinon';
import instances from '../../src/instances.js';

await import('../../examples/aria/aria.js');
const instance = instances.get(process.stdout)!;
await instance.waitUntilRenderFlush();

const read = stub(process.stdin, 'read').returns(null);
read.onFirstCall().returns('\u001B[32u'.repeat(Number(process.argv[2])));
process.stdin.emit('readable');
read.restore();
await instance.waitUntilRenderFlush();
instance.unmount();
await instance.waitUntilExit();
