# Migrate from Ink 2

Ink 3 has a lot of exciting new features, but unfortunately, there are some breaking changes.
If you're migrating your app and running into issues that this guide doesn't cover, feel free to open an issue.

## Install

```
$ npm install ink@next react
```

## Breaking changes

### Text must be wrapped in a `<Text>` component ([#299](https://github.com/vadimdemedes/ink/pull/299))

There are many more details on this change in the linked PR above, but the TLDR is that all text must be wrapped in a [`<Text>`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#text) component now. Otherwise, Ink will throw an error like this:

> Text string "Hello World" must be rendered inside <Text> component

If you're used to building apps with React Native, Ink now has the same requirement in regards to text so it should feel familiar to you.

```jsx
// Before
<Box>Hello World</Box>

// After
<Text>Hello World</Text>
```

**Note:** It's allowed to have nested `<Text>` components. `<Box>` can't be used inside `<Text>` component.

### Merged `<Color>` component functionality into `<Text>` ([#301](https://github.com/vadimdemedes/ink/pull/301))

In Ink 3 there's no more `<Color>` component. Instead, you can use the [`color`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#color) and [`backgroundColor`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#backgroundcolor) props directly in [`<Text>`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#text). The way you specify colors has also changed a bit. Before there was a separate prop for each color, now there are just two props, which accept CSS-like values.

```jsx
// Before
<Color red>
	<Text>Hello World</Text>
</Color>

<Color hex="#ffffff">
	<Text>Hello World</Text>
</Color>

<Color white bgGreen>
	<Text>Hello World</Text>
</Color>

// After
<Text color="red">Hello World</Text>

<Text color="#ffffff">Hello World</Text>

<Text color="white" backgroundColor="green">Hello World</Text>
```

### Removed `<div>` and `<span>` ([#306](https://github.com/vadimdemedes/ink/pull/306))

It was “illegal” to use these tags directly before, but now they're removed completely. If you are using them, switch from `<div>` to [`<Box>`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#box) and from `<span>` to [`<Text>`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#text).

### Removed `unstable__transformChildren` from `<Box>` and `<Text>` ([ab36e7f](https://github.com/vadimdemedes/ink/commit/ab36e7f))

Previously this function was used to transform the string representation of a component's `children`. You can achieve the same with the [`<Transform>`](https://github.com/vadimdemedes/ink#transform) component.

```jsx
// Before
<Box unstable__transformChildren={children => children.toUpperCase()}>
	Hello World
</Box>

// After
<Transform transform={children => children.toUpperCase()}>
	<Text>Hello World</Text>
</Transform>
```

### Removed `AppContext`, `StdinContext` and `StdoutContext` in favor of `useApp`, `useStdin` and `useStdout` hooks ([055a196](https://github.com/vadimdemedes/ink/commit/055a196))

Hooks are the future.

```jsx
// Before
import {AppContext, StdinContext, StdoutContext} from 'ink';

const Example = () => (
	<AppContext.Consumer>
		{appProps => (
			<StdinContext.Consumer>
				{stdinProps => (
					<StdoutContext.Consumer>
						{stdoutProps => (
							…
						)}
					</StdoutContext.Consumer>
				)}
			</StdinContext.Consumer>
		)}
	</AppContext.Consumer>
);

// After
import {useApp, useStdin, useStdout} from 'ink';

const Example = () => {
	const appProps = useApp();
	const stdinProps = useStdin();
	const stdoutProps = useStdout();

	return …;
};
```

### New `<Static>` component ([#281](https://github.com/vadimdemedes/ink/pull/281))

The functionality has remained the same, but the API has changed and performance has significantly improved. The new API looks very similar to the one commonly used in virtual list libraries, like `react-tiny-virtual-list`.

```jsx
// Before
<Static>
	{items.map(item => (
		<Text key={item.id}>
			{item.title}
		</Text>
	))}
</Static>

// After
<Static items={items}>
	{item => (
		<Text key={item.id}>
			{item.title}
		</Text>
	)}
</Static>
```

### Log interception ([acb6ed2](https://github.com/vadimdemedes/ink/commit/acb6ed2))

Ink 3 intercepts all output coming from `console.log`, `console.error` and other `console` methods to display them above main Ink output.
If this is not the desired behavior, you can disable it using the `patchConsole` option:

```jsx
import {render} from 'ink';

render(<MyApp />, {patchConsole: false});
```

### Use `<Transform>` component instead of `unstable__transformChildren` ([#277](https://github.com/vadimdemedes/ink/pull/277))

Ink 3 introduces a new way to transform the output of text components - [`<Transform>`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#transform).
The migration should be painless as it accepts the same transformation function as before.

```jsx
// Before
<Text unstable__transformChildren={children => children.toUpperCase()}>
	Hello World
</Text>;

// After
import {Transform} from 'ink';

<Transform transform={children => children.toUpperCase()}>
	<Text>Hello World</Text>
</Transform>;
```

Note that it's no longer recommended to apply transformations on `<Box>` components due to unpredictable rendering results.

### Use `measureElement` to measure box dimensions ([#307](https://github.com/vadimdemedes/ink/pull/307))

There's a new function exported by Ink called [`measureElement`](https://github.com/vadimdemedes/ink/tree/0efbf248d98e680c266d96b624c56490ae280936#measureelementref) that measures the dimensions of any `<Box>` component.
Previously you had to use the undocumented `unstable__getComputedWidth` method.

```jsx
// Before
const Example = () => {
	const boxRef = useRef();

	useEffect(() => {
		const width = boxRef.current.unstable__getComputedWidth();
		//=> 100
	}, []);

	return <Box ref={boxRef}>Hello World</Box>;
};

// After
import {measureElement} from 'ink';

const Example = () => {
	const boxRef = useRef();

	useEffect(() => {
		const {width, height} = measureElement(boxRef.current);
		//=> width = 100, height = 1
	}, []);

	return <Box ref={boxRef}>Hello World</Box>;
};
```

### Text is wrapped by default

Previously, [`<Box>`](https://github.com/vadimdemedes/ink/tree/v2.7.1#box) had a [`textWrap`](https://github.com/vadimdemedes/ink/tree/v2.7.1#textwrap) property, which would specify if and how text inside that element should be wrapped.
In Ink 3 all text is wrapped by default based on container's dimensions and `textWrap` property has moved to [`<Text>`](https://github.com/vadimdemedes/ink#text) component instead and is now named [`wrap`](https://github.com/vadimdemedes/ink#wrap).
It acceps the same values as before.

```jsx
// Before
<Box textWrap="wrap">Hello World</Box>
<Box textWrap="truncate">Hello World</Box>

// After
<Text>Hello World</Text>
<Text wrap="truncate">Hello World</Text>
```
