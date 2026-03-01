import React, {useMemo, useState, useLayoutEffect, type ReactNode} from 'react';
import {type Styles} from '../styles.js';

export type Props<T> = {
	/**
	Array of items of any type to render using the function you pass as a component child.
	*/
	readonly items: T[];

	/**
	Styles to apply to a container of child elements. See <Box> for supported properties.
	*/
	readonly style?: Styles;

	/**
	Function that is called to render every item in the `items` array. The first argument is the item itself, and the second argument is the index of that item in the `items` array. Note that a `key` must be assigned to the root component.
	*/
	readonly children: (item: T, index: number) => ReactNode;
};

/**
`<Static>` component permanently renders its output above everything else. It's useful for displaying activity like completed tasks or logs—things that don't change after they're rendered (hence the name "Static").

It's preferred to use `<Static>` for use cases like these when you can't know or control the number of items that need to be rendered.

For example, [Tap](https://github.com/tapjs/node-tap) uses `<Static>` to display a list of completed tests. [Gatsby](https://github.com/gatsbyjs/gatsby) uses it to display a list of generated pages while still displaying a live progress bar.
*/
export default function Static<T>(props: Props<T>) {
	const {items, children: render, style: customStyle} = props;
	const [index, setIndex] = useState(0);

	const itemsToRender: T[] = useMemo(() => {
		return items.slice(index);
	}, [items, index]);

	useLayoutEffect(() => {
		setIndex(items.length);
	}, [items.length]);

	const children = itemsToRender.map((item, itemIndex) => {
		return render(item, index + itemIndex);
	});

	const style: Styles = useMemo(
		() => ({
			position: 'absolute',
			flexDirection: 'column',
			...customStyle,
		}),
		[customStyle],
	);

	return (
		<ink-box internal_static style={style}>
			{children}
		</ink-box>
	);
}
