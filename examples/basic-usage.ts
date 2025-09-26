/**
Basic usage example of composeTextFragments API
*/

import {composeTextFragments} from '../src/index.js';

// Simple example showing the API works for i18n scenarios
const fragments = [
	'Welcome ',
	{text: 'Alice', styles: [{color: 'green', bold: true}]},
	'! You have ',
	{text: '5', styles: [{color: 'yellow'}]},
	' messages.',
];

const result = composeTextFragments(fragments);
console.log('Result:', result);
// This would display: "Welcome Alice! You have 5 messages."
// with Alice in green+bold and 5 in yellow
