import React from 'react';
import type {FC} from 'react';
import Box from './Box';

// A flexible space that expands along the major axis of its containing layout
const Spacer: FC = () => <Box flexGrow={1} />;

Spacer.displayName = 'Spacer';

export default Spacer;
