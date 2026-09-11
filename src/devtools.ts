/* eslint-disable import-x/order */

// eslint-disable-next-line import-x/no-unassigned-import
import './devtools-window-polyfill.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import devtools from 'react-devtools-core';
import isDevToolsReachable from './is-devtools-reachable.js';

if (await isDevToolsReachable()) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	(devtools as any).initialize();
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	(devtools as any).connectToDevTools();
} else {
	console.warn(
		'DEV is set to true, but the React DevTools server is not running. Start it with:\n\n$ npx react-devtools\n',
	);
}
