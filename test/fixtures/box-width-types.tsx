import React from 'react';
import {Box, type BoxProps} from '../../src/index.js';

<Box minWidth={5} maxWidth={10} />;
<Box minWidth={undefined} maxWidth={undefined} />;
<Box width="50%" height="50%" minHeight="25%" maxHeight="75%" />;

// @ts-expect-error Percentage minimum widths are not supported by Yoga.
<Box minWidth="50%" />;
// @ts-expect-error Percentage maximum widths are not supported by Yoga.
<Box maxWidth="50%" />;

// @ts-expect-error The public props type must reject percentage minimum widths too.
const minimum: BoxProps = {minWidth: '50%'};
// @ts-expect-error The public props type must reject percentage maximum widths too.
const maximum: BoxProps = {maxWidth: '50%'};

export {minimum, maximum};
