import process from 'node:process';
import {createContext} from 'react';

export type Props = {
	/**
	Stderr stream passed to `render()` in `options.stderr` or `process.stderr` by default.
	*/
	readonly stderr: NodeJS.WriteStream;

	/**
	Write any string to stderr while preserving Ink's output. It's useful when you want to display external information outside of Ink's rendering and ensure there's no conflict between the two. It's similar to `<Static>`, except it can't accept components; it only works with strings.
	*/
	readonly write: (data: string) => void;
};

/**
`StderrContext` is a React context that exposes the stderr stream.
*/
// eslint-disable-next-line @typescript-eslint/naming-convention
const StderrContext = createContext<Props>({
	stderr: process.stderr,
	write() {},
});

StderrContext.displayName = 'InternalStderrContext';

export default StderrContext;
