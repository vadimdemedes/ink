import * as React from 'react';
import Box from './Box';

/**
 * A flexible space that expands along the major axis of its containing layout.
 * It's useful as a shortcut for filling all the available spaces between elements.
 */
const Spacer: React.FC = () => <Box flexGrow={1} />;

Spacer.displayName = 'Spacer';

export default Spacer;
