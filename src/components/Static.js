import React from 'react';
import PropTypes from 'prop-types';

// This component allows developers to render output before main output from all the other components.
// The reason it's called <Static> is it's append-only output. Output from <Static> components
// is written permantently to stdout and is never updated afterwards. If <Static> component
// receives new children, Ink will detect the changes and write them to stdout.
// In order for this mechanism to work perfectly, <Static> children must never update their output
// once they've been appended to <Static>.
//
// A good example of where this component might be useful is interface like Jest's.
// When running tests, Jest keeps writing completed tests to output, while continuously
// rendering test stats at the end of the output.
const Static = ({children}) => (
	<div static>
		{children}
	</div>
);

Static.propTypes = {
	children: PropTypes.node
};

export default Static;
