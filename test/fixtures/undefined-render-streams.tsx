import process from 'node:process';
import React from 'react';
import {render, Text, useStdin, useStdout, useStderr} from '../../src/index.js';

function Example() {
	const {stdin} = useStdin();
	const {stdout} = useStdout();
	const {stderr} = useStderr();
	return (
		<Text>
			Default streams:{' '}
			{String(
				stdin === process.stdin &&
					stdout === process.stdout &&
					stderr === process.stderr,
			)}
		</Text>
	);
}

const instance = render(<Example />, {
	stdin: undefined,
	stdout: undefined,
	stderr: undefined,
	patchConsole: false,
});
await instance.waitUntilRenderFlush();
instance.unmount();
await instance.waitUntilExit();
