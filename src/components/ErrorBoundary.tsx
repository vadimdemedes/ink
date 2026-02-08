import React, {PureComponent, type ReactNode} from 'react';
import ErrorOverview from './ErrorOverview.js';

type Props = {
	readonly children: ReactNode;
	readonly onError: (error: Error) => void;
};

type State = {
	readonly error?: Error;
};

// Error boundary must be a class component since getDerivedStateFromError
// and componentDidCatch are not available as hooks
export default class ErrorBoundary extends PureComponent<Props, State> {
	static displayName = 'InternalErrorBoundary';

	static getDerivedStateFromError(error: Error) {
		return {error};
	}

	override state: State = {
		error: undefined,
	};

	override componentDidCatch(error: Error) {
		this.props.onError(error);
	}

	override render() {
		if (this.state.error) {
			return <ErrorOverview error={this.state.error} />;
		}

		return this.props.children;
	}
}
