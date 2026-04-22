import React, {PureComponent, type ReactNode} from 'react';
import {useAppInternal} from '../hooks/use-app.js';
import ErrorOverview from './ErrorOverview.js';

type Props = {
	readonly children: ReactNode;
};

type ClassProps = Props & {
	readonly onError: (error: Error) => void;
};

type State = {
	readonly error?: Error;
};

// Error boundary must be a class component since getDerivedStateFromError
// and componentDidCatch are not available as hooks
class ErrorBoundaryClass extends PureComponent<ClassProps, State> {
	static displayName = 'InternalErrorBoundary';

	static getDerivedStateFromError(error: Error) {
		return {error};
	}

	override state: State = {
		error: undefined,
	};

	override componentDidCatch(error: Error): void {
		this.props.onError(error);
	}

	override render(): ReactNode {
		if (this.state.error) {
			return <ErrorOverview error={this.state.error} />;
		}

		return this.props.children;
	}
}

export default function ErrorBoundary({children}: Props): ReactNode {
	const {exit} = useAppInternal();
	return <ErrorBoundaryClass onError={exit}>{children}</ErrorBoundaryClass>;
}
