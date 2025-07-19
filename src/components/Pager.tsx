import React, {useState} from 'react';
import useInput, {type Key} from '../hooks/use-input.js';
import useApp from '../hooks/use-app.js';
import useStdin from '../hooks/use-stdin.js';
import Box from './Box.js';
import Text from './Text.js';

type PagerProps = {
	readonly children: React.ReactNode;
	readonly pageHeight: number;
};

export function Pager({children, pageHeight}: PagerProps) {
	const {exit} = useApp();
	const {isRawModeSupported} = useStdin();
	const [currentPage, setCurrentPage] = useState(0);
	const items = React.Children.toArray(children);
	const totalPages = Math.ceil(items.length / pageHeight);

	useInput(
		(_, key: Key) => {
			if (key.leftArrow) {
				setCurrentPage(prev => Math.max(0, prev - 1));
			}

			if (key.rightArrow) {
				setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
			}

			if (key.escape) {
				exit();
			}
		},
		{isActive: isRawModeSupported},
	);

	const startIndex = currentPage * pageHeight;
	const endIndex = startIndex + pageHeight;
	const pageItems = items.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column">
			<Box flexDirection="column">{pageItems}</Box>
			<Box>
				<Text>
					Page {currentPage + 1} of {totalPages}
					{isRawModeSupported && ' (Use ← and → to navigate, ESC to exit)'}
				</Text>
			</Box>
		</Box>
	);
}
