import React from 'react';
import useFocus from '../hooks/use-focus';

function withFocus(WrappedComponent) {
	// eslint-disable-next-line react/prop-types
	function WithFocusHOC({forwardedRef, ...rest}) {
		const ref = forwardedRef; // Use forwarded ref if it exists
		const hasFocus = useFocus(); // Real hook that manage focus

		return <WrappedComponent ref={ref} hasFocus={hasFocus} {...rest}/>;
	}

	// Inject forwarded ref to WithFocusHOC and set a displayName
	function forwardRef(props, ref) {
		return <WithFocusHOC forwardedRef={ref} {...props}/>;
	}

	const name = WrappedComponent.displayName || WrappedComponent.name;
	forwardRef.displayName = `withFocus(${name})`;

	return React.forwardRef(forwardRef);
}

export default withFocus;
