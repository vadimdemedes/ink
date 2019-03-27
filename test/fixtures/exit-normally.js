'use strict';
const React = require('react');
const {render, Box} = require('../..');

const {waitUntilExit} = render(<Box>Hello World</Box>);
waitUntilExit().then(() => console.log('exited'));
