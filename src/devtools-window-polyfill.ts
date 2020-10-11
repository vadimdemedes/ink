// Ignoring missing types error to avoid adding another dependency for this hack to work
// @ts-ignore
import ws from 'ws';

const customGlobal = global as any;

// These things must exist before importing `react-devtools-core`
if (!customGlobal.WebSocket) {
	customGlobal.WebSocket = ws;
}

if (!customGlobal.window) {
	customGlobal.window = global;
}

// Filter out Ink's internal components from devtools for a cleaner view.
// Also, ince `react-devtools-shared` package isn't published on npm, we can't
// use its types, that's why there are hard-coded values in `type` fields below.
// See https://github.com/facebook/react/blob/edf6eac8a181860fd8a2d076a43806f1237495a1/packages/react-devtools-shared/src/types.js#L24
customGlobal.window.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = [
	{
		// ComponentFilterElementType
		type: 1,
		// ElementTypeHostComponent
		value: 7,
		isEnabled: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalApp',
		isEnabled: true,
		isValid: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalAppContext',
		isEnabled: true,
		isValid: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalStdoutContext',
		isEnabled: true,
		isValid: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalStderrContext',
		isEnabled: true,
		isValid: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalStdinContext',
		isEnabled: true,
		isValid: true
	},
	{
		// ComponentFilterDisplayName
		type: 2,
		value: 'InternalFocusContext',
		isEnabled: true,
		isValid: true
	}
];
