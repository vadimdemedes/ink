import test, {type TestContext} from 'node:test';
import Yoga from 'yoga-layout';
import applyStyles from '../src/styles.js';

for (const [property, edge] of [
	['marginX', Yoga.EDGE_LEFT],
	['marginY', Yoga.EDGE_TOP],
	['marginLeft', Yoga.EDGE_LEFT],
	['marginRight', Yoga.EDGE_RIGHT],
	['marginTop', Yoga.EDGE_TOP],
	['marginBottom', Yoga.EDGE_BOTTOM],
] as const) {
	test(`removing ${property} restores shorthand margin`, (t: TestContext) => {
		const node = Yoga.Node.create();
		t.after(() => {
			node.free();
		});

		applyStyles(node, {margin: 2, [property]: 1});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedMargin(edge), 1);

		applyStyles(node, {[property]: undefined});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedMargin(edge), 2);

		applyStyles(node, {[property]: 0});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedMargin(edge), 0);
	});
}

for (const [property, edge] of [
	['paddingX', Yoga.EDGE_LEFT],
	['paddingY', Yoga.EDGE_TOP],
	['paddingLeft', Yoga.EDGE_LEFT],
	['paddingRight', Yoga.EDGE_RIGHT],
	['paddingTop', Yoga.EDGE_TOP],
	['paddingBottom', Yoga.EDGE_BOTTOM],
] as const) {
	test(`removing ${property} restores shorthand padding`, (t: TestContext) => {
		const node = Yoga.Node.create();
		t.after(() => {
			node.free();
		});

		applyStyles(node, {padding: 2, [property]: 1});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedPadding(edge), 1);

		applyStyles(node, {[property]: undefined});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedPadding(edge), 2);

		applyStyles(node, {[property]: 0});
		node.calculateLayout();
		t.assert.strictEqual(node.getComputedPadding(edge), 0);
	});
}

for (const [property, getter] of [
	['width', 'getWidth'],
	['height', 'getHeight'],
	['minHeight', 'getMinHeight'],
	['maxHeight', 'getMaxHeight'],
	['flexBasis', 'getFlexBasis'],
] as const) {
	test(`${property} preserves fractional percentages`, (t: TestContext) => {
		const node = Yoga.Node.create();
		t.after(() => {
			node.free();
		});

		applyStyles(node, {[property]: '12.5%'});

		t.assert.deepStrictEqual(node[getter](), {
			value: 12.5,
			unit: Yoga.UNIT_PERCENT,
		});
	});
}
