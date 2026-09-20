import React, {useLayoutEffect, useState} from 'react';
import test from 'ava';
import {Static, Text, renderToString} from '../src/index.js';

for (const replace of [false, true]) {
	test(`renderToString reflects a layout-effect Static ${replace ? 'replacement' : 'removal'}`, t => {
		function Example() {
			const [updated, setUpdated] = useState(false);
			useLayoutEffect(() => {
				setUpdated(true);
			}, []);

			return (
				<>
					{!updated || replace ? (
						<Static
							key={updated ? 'new' : 'old'}
							items={[updated ? 'New' : 'Old']}
						>
							{item => <Text key={item}>{item}</Text>}
						</Static>
					) : null}
					<Text>Live</Text>
				</>
			);
		}

		t.is(renderToString(<Example />), replace ? 'New\nLive' : 'Live');
	});
}

test('layout-effect appends to the same Static retain earlier items', t => {
	function Example() {
		const [items, setItems] = useState(['First']);
		useLayoutEffect(() => {
			setItems(['First', 'Second']);
		}, []);

		return (
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
		);
	}

	t.is(renderToString(<Example />), 'First\nSecond');
});

test('replacement Static survives cleanup in static-only output', t => {
	let cleanupCount = 0;
	function Example() {
		const [updated, setUpdated] = useState(false);
		useLayoutEffect(() => {
			setUpdated(true);
			return () => {
				cleanupCount++;
			};
		}, []);

		return (
			<Static key={String(updated)} items={[updated ? 'New' : 'Old']}>
				{item => <Text key={item}>{item}</Text>}
			</Static>
		);
	}

	t.is(renderToString(<Example />), 'New');
	t.is(cleanupCount, 1);
});
