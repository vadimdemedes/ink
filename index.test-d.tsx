import * as React from 'react';
import {expectType} from 'tsd';
import {render, Instance, Text} from '.';

const instance = render(<Text>🦄</Text>, {
	debug: true
});

expectType<Instance>(instance);
expectType<void>(instance.unmount());
