import React from 'react';
import {Text, render} from '../../src';

const {waitUntilExit} = render(<Text>Hello World</Text>);
waitUntilExit().then(() => console.log('exited'));
