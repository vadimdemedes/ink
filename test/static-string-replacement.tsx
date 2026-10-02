import test, {type TestContext} from 'node:test';
import React, {useLayoutEffect, useState} from 'react';
import {Static, Text, renderToString} from '../src/index.js';

for (const shouldReplace of [false, true]) {
	test(`renderToString reflects a layout-effect Static ${shouldReplace ? 'replacement' : 'removal'}`, (t: TestContext) => {
		function Example() {
			const [updated, setUpdated] = useState(false);
			useLayoutEffect(() => {
				setUpdated(true);
			}, []);

			return (
				<>
					{!updated || shouldReplace ? (
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

		t.assert.strictEqual(
			renderToString(<Example />),
			shouldReplace ? 'New\nLive' : 'Live',
		);
	});
}

test('layout-effect appends to the same Static retain earlier items', (t: TestContext) => {
	function Example() {
		const [items, setItems] = useState(['First']);
		useLayoutEffect(() => {
			setItems(['First', 'Second']);
		}, []);

		return (
			<Static items={items}>{item => <Text key={item}>{item}</Text>}</Static>
		);
	}

	t.assert.strictEqual(renderToString(<Example />), 'First\nSecond');
});

test('replacement Static survives cleanup in static-only output', (t: TestContext) => {
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

	t.assert.strictEqual(renderToString(<Example />), 'New');
	t.assert.strictEqual(cleanupCount, 1);
});
