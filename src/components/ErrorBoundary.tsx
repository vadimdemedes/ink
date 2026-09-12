import {types} from 'node:util';
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

	static getDerivedStateFromError(error: unknown) {
		return {
			// eslint-disable-next-line @typescript-eslint/no-deprecated -- Error.isError is not available in Node.js 22.
			error: types.isNativeError(error) ? error : new Error(String(error)),
		};
	}

	override state: State = {
		error: undefined,
	};

	override componentDidCatch(): void {
		this.props.onError(this.state.error!);
	}

	override render(): ReactNode {
		if (this.state.error) {
			return <ErrorOverview error={this.state.error} />;
		}

		return this.props.children;
	}
}
