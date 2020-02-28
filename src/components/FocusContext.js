import React from 'react';

const FocusContext = React.createContext({
	register: () => 1,
	unregister: _ => {},
	hasFocus: _ => false
});

export default FocusContext;
