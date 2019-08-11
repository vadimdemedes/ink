'use strict';
const React = require('react');
const {render, Box} = require('../..');

const {waitUntilExit} = render(<Box>Hello World</Box>, {
	experimental: process.env.EXPERIMENTAL === 'true'
});

waitUntilExit().then(() => console.log('exited'));
