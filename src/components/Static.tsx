import React, {ReactNode, useMemo, useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import {Styles} from '../styles';

export interface StaticProps<T> extends Styles {
	items: T[];
	style?: Styles;
	children: (item: T, index: number) => ReactNode;
}

/**
 * `<Static>` component permanently renders its output above everything else.
 * It's useful for displaying activity like completed tasks or logs - things that
 * are not changing after they're rendered (hence the name "Static").
 *
 * It's preferred to use `<Static>` for use cases like these, when you can't know
 * or control the amount of items that need to be rendered.
 *
 * For example, [Tap](https://github.com/tapjs/node-tap) uses `<Static>` to display
 * a list of completed tests. [Gatsby](https://github.com/gatsbyjs/gatsby) uses it
 * to display a list of generated pages, while still displaying a live progress bar.
 */
export const Static = <T,>(props: StaticProps<T>) => {
	const {items, children: render, style: customStyle} = props;
	const [index, setIndex] = useState(0);

	const itemsToRender: T[] = useMemo(() => {
		return items.slice(index);
	}, [items, index]);

	useEffect(() => {
		setIndex(items.length);
	}, [items.length]);

	const children = itemsToRender.map((item, itemIndex) => {
		return render(item, index + itemIndex);
	});

	const style: Styles = useMemo(
		() => ({
			position: 'absolute',
			flexDirection: 'column',
			...customStyle
		}),
		[customStyle]
	);

	return (
		<div
			// @ts-ignore
			internal_static
			style={style}
		>
			{children}
		</div>
	);
};

Static.propTypes = {
	items: PropTypes.array.isRequired,
	style: PropTypes.object,
	children: PropTypes.func.isRequired
};
