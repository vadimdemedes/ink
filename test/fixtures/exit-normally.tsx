import React from 'react';
import {Box, render} from '../../src';

const {waitUntilExit} = render(<Box>Hello World</Box>);
waitUntilExit().then(() => console.log('exited'));
