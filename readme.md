[![](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md)

---

<div align="center">
	<br>
	<br>
	<img width="240" alt="Ink" src="media/logo.png">
	<br>
	<br>
	<br>
</div>

> React for CLIs. Build and test your CLI output using components.

[![Build Status](https://github.com/vadimdemedes/ink/workflows/test/badge.svg)](https://github.com/vadimdemedes/ink/actions)
[![npm](https://img.shields.io/npm/dm/ink?logo=npm)](https://npmjs.com/package/ink)

Ink provides the same component-based UI building experience that React offers in the browser, but for command-line apps.
It uses [Yoga](https://github.com/facebook/yoga) to build Flexbox layouts in the terminal, so most CSS-like properties are available in Ink as well.
If you are already familiar with React, you already know Ink.

Since Ink is a React renderer, all features of React are supported.
Head over to the [React](https://reactjs.org) website for documentation on how to use it.
Only Ink's methods are documented in this readme.

---

<div align="center">
	<p>
		<p>
			<sup>
				<a href="https://opencollective.com/vadimdemedes">My open source work is supported by the community ❤️</a>
			</sup>
		</p>
	</p>
</div>

## Install

```sh
npm install ink react
```

## Usage

```jsx
import React, {useState, useEffect} from 'react';
import {render, Text} from 'ink';

const Counter = () => {
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setCounter(previousCounter => previousCounter + 1);
		}, 100);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return <Text color="green">{counter} tests passed</Text>;
};

render(<Counter />);
```

<img src="media/demo.svg" width="600">

Feel free to play around with the code and fork this Repl at [https://repl.it/@vadimdemedes/ink-counter-demo](https://repl.it/@vadimdemedes/ink-counter-demo).

## Who's Using Ink?

- [Codex](https://github.com/openai/codex) - An agentic coding tool made by OpenAI.
- [Claude Code](https://github.com/anthropics/claude-code) - An agentic coding tool made by Anthropic.
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - An agentic coding tool made by Google.
- [GitHub Copilot for CLI](https://githubnext.com/projects/copilot-cli) - Just say what you want the shell to do.
- [Canva CLI](https://www.canva.dev/docs/apps/canva-cli/) - CLI for creating and managing Canva Apps.
- [Cloudflare's Wrangler](https://github.com/cloudflare/wrangler2) - The CLI for Cloudflare Workers.
- [Linear](https://linear.app) - Linear built an internal CLI for managing deployments, configs, and other housekeeping tasks.
- [Gatsby](https://www.gatsbyjs.org) - Gatsby is a modern web framework for blazing-fast websites.
- [tap](https://node-tap.org) - A Test-Anything-Protocol library for JavaScript.
- [Terraform CDK](https://github.com/hashicorp/terraform-cdk) - Cloud Development Kit (CDK) for HashiCorp Terraform.
- [Specify CLI](https://specifyapp.com) - Automate the distribution of your design tokens.
- [Twilio's SIGNAL](https://github.com/twilio-labs/plugin-signal2020) - CLI for Twilio's SIGNAL conference. [Blog post](https://www.twilio.com/blog/building-conference-cli-in-react).
- [Typewriter](https://github.com/segmentio/typewriter) - Generates strongly-typed [Segment](https://segment.com) analytics clients from arbitrary JSON Schema.
- [Prisma](https://www.prisma.io) - The unified data layer for modern applications.
- [Blitz](https://blitzjs.com) - The Fullstack React Framework.
- [New York Times](https://github.com/nytimes/kyt) - NYT uses Ink's `kyt` - a toolkit that encapsulates and manages the configuration for web apps.
- [tink](https://github.com/npm/tink) - A next-generation runtime and package manager.
- [Inkle](https://github.com/jrr/inkle) - A Wordle game.
- [loki](https://github.com/oblador/loki) - Visual regression testing tool for Storybook.
- [Bit](https://github.com/teambit/bit) - Build, distribute, and collaborate on components.
- [Remirror](https://github.com/remirror/remirror) - Your friendly, world-class editor toolkit.
- [Prime](https://github.com/birkir/prime) - Open-source GraphQL CMS.
- [emoj](https://github.com/sindresorhus/emoj) - Find relevant emojis.
- [emma](https://github.com/maticzav/emma-cli) - Find and install npm packages easily.
- [npm-check-extras](https://github.com/akgondber/npm-check-extras) - Check for outdated and unused dependencies, and run update/delete actions on selected ones.
- [swiff](https://github.com/simple-integrated-marketing/swiff) - Multi-environment command-line tools for time-saving web developers.
- [share](https://github.com/marionebl/share-cli) - Share files quickly.
- [Kubelive](https://github.com/ameerthehacker/kubelive) - A CLI for Kubernetes that provides live data about the cluster and its resources.
- [changelog-view](https://github.com/jdeniau/changelog-view) - View changelogs.
- [cfpush](https://github.com/mamachanko/cfpush) - Interactive Cloud Foundry tutorial.
- [startd](https://github.com/mgrip/startd) - Turn your React component into a web app.
- [wiki-cli](https://github.com/hexrcs/wiki-cli) - Search Wikipedia and read article summaries.
- [garson](https://github.com/goliney/garson) - Build interactive, config-based command-line interfaces.
- [git-contrib-calendar](https://github.com/giannisp/git-contrib-calendar) - Display a contributions calendar for any Git repository.
- [gitgud](https://github.com/GitGud-org/GitGud) - Interactive command-line GUI for Git.
- [Autarky](https://github.com/pranshuchittora/autarky) - Find and delete old `node_modules` directories to free up disk space.
- [fast-cli](https://github.com/sindresorhus/fast-cli) - Test your download and upload speeds.
- [tasuku](https://github.com/privatenumber/tasuku) - Minimal task runner.
- [mnswpr](https://github.com/mordv/mnswpr) - A Minesweeper game.
- [lrn](https://github.com/krychu/lrn) - Learning by repetition.
- [turdle](https://github.com/mynameisankit/turdle) - A Wordle game.
- [Shopify CLI](https://github.com/Shopify/cli) - Build apps, themes, and storefronts for the Shopify platform.
- [ToDesktop CLI](https://www.todesktop.com/electron) - All-in-one platform for building Electron apps.
- [Walle](https://github.com/Pobepto/walle) - A full-featured crypto wallet for EVM networks.
- [Sudoku](https://github.com/mrozio13pl/sudoku-in-terminal) - A Sudoku game.
- [Sea Trader](https://github.com/zyishai/sea-trader) - A Taipan!-inspired trading simulator game.
- [srtd](https://github.com/t1mmen/srtd) - Live-reloading SQL templates for Supabase projects.
- [tweakcc](https://github.com/Piebald-AI/tweakcc) - Customize your Claude Code styling.
- [argonaut](https://github.com/darksworm/argonaut) - Manage Argo CD resources.
- [Qodo Command](https://github.com/qodo-ai/command) - Build, run, and manage AI agents.

*(PRs welcome. Append new entries at the end. Repos must have 100+ stars and showcase Ink beyond a basic list picker.)*

## Contents

- [Getting Started](#getting-started)
- [Components](#components)
  - [`<Text>`](#text)
  - [`<Box>`](#box)
  - [`<Newline>`](#newline)
  - [`<Spacer>`](#spacer)
  - [`<Static>`](#static)
  - [`<Transform>`](#transform)
- [Hooks](#hooks)
  - [`useInput`](#useinputinputhandler-options)
  - [`useApp`](#useapp)
  - [`useStdin`](#usestdin)
  - [`useStdout`](#usestdout)
  - [`useStderr`](#usestderr)
  - [`useFocus`](#usefocusoptions)
  - [`useFocusManager`](#usefocusmanager)
- [API](#api)
- [Testing](#testing)
- [Using React Devtools](#using-react-devtools)
- [Screen Reader Support](#screen-reader-support)
- [Useful Components](#useful-components)
- [Useful Hooks](#useful-hooks)
- [Examples](#examples)

## Getting Started

Use [create-ink-app](https://github.com/vadimdemedes/create-ink-app) to quickly scaffold a new Ink-based CLI.

```sh
npx create-ink-app my-ink-cli
```

Alternatively, create a TypeScript project:

```sh
npx create-ink-app --typescript my-ink-cli
```

<details><summary>Manual JavaScript setup</summary>
<p>
Ink requires the same Babel setup as you would do for regular React-based apps in the browser.

Set up Babel with a React preset to ensure all examples in this readme work as expected.
After [installing Babel](https://babeljs.io/docs/en/usage), install `@babel/preset-react` and insert the following configuration in `babel.config.json`:

```sh
npm install --save-dev @babel/preset-react
```

```json
{
	"presets": ["@babel/preset-react"]
}
```

Next, create a file `source.js`, where you'll type code that uses Ink:

```jsx
import React from 'react';
import {render, Text} from 'ink';

const Demo = () => <Text>Hello World</Text>;

render(<Demo />);
```

Then, transpile this file with Babel:

```sh
npx babel source.js -o cli.js
```

Now you can run `cli.js` with Node.js:

```sh
node cli
```

If you don't like transpiling files during development, you can use [import-jsx](https://github.com/vadimdemedes/import-jsx) or [@esbuild-kit/esm-loader](https://github.com/esbuild-kit/esm-loader) to `import` a JSX file and transpile it on the fly.

</p>
</details>

Ink uses [Yoga](https://github.com/facebook/yoga), a Flexbox layout engine, to build great user interfaces for your CLIs using familiar CSS-like properties you've used when building apps for the browser.
It's important to remember that each element is a Flexbox container.
Think of it as if every `<div>` in the browser had `display: flex`.
See [`<Box>`](#box) built-in component below for documentation on how to use Flexbox layouts in Ink.
Note that all text must be wrapped in a [`<Text>`](#text) component.

## Components

### `<Text>`

This component can display text and change its style to make it bold, underlined, italic, or strikethrough.

```jsx
import {render, Text} from 'ink';

const Example = () => (
	<>
		<Text color="green">I am green</Text>
		<Text color="black" backgroundColor="white">
			I am black on white
		</Text>
		<Text color="#ffffff">I am white</Text>
		<Text bold>I am bold</Text>
		<Text italic>I am italic</Text>
		<Text underline>I am underline</Text>
		<Text strikethrough>I am strikethrough</Text>
		<Text inverse>I am inversed</Text>
	</>
);

render(<Example />);
```

**Note:** `<Text>` allows only text nodes and nested `<Text>` components inside of it. For example, `<Box>` component can't be used inside `<Text>`.

#### color

Type: `string`

Change text color.
Ink uses [chalk](https://github.com/chalk/chalk) under the hood, so all its functionality is supported.

```jsx
<Text color="green">Green</Text>
<Text color="#005cc5">Blue</Text>
<Text color="rgb(232, 131, 136)">Red</Text>
```

<img src="media/text-color.jpg" width="247">

#### backgroundColor

Type: `string`

Same as `color` above, but for background.

```jsx
<Text backgroundColor="green" color="white">Green</Text>
<Text backgroundColor="#005cc5" color="white">Blue</Text>
<Text backgroundColor="rgb(232, 131, 136)" color="white">Red</Text>
```

<img src="media/text-backgroundColor.jpg" width="226">

#### dimColor

Type: `boolean`\
Default: `false`

Dim the color (make it less bright).

```jsx
<Text color="red" dimColor>
	Dimmed Red
</Text>
```

<img src="media/text-dimColor.jpg" width="138">

#### bold

Type: `boolean`\
Default: `false`

Make the text bold.

#### italic

Type: `boolean`\
Default: `false`

Make the text italic.

#### underline

Type: `boolean`\
Default: `false`

Make the text underlined.

#### strikethrough

Type: `boolean`\
Default: `false`

Make the text crossed with a line.

#### inverse

Type: `boolean`\
Default: `false`

Invert background and foreground colors.

```jsx
<Text inverse color="yellow">
	Inversed Yellow
</Text>
```

<img src="media/text-inverse.jpg" width="138">

#### wrap

Type: `string`\
Allowed values: `wrap` `truncate` `truncate-start` `truncate-middle` `truncate-end`\
Default: `wrap`

This property tells Ink to wrap or truncate text if its width is larger than the container.
If `wrap` is passed (the default), Ink will wrap text and split it into multiple lines.
If `truncate-*` is passed, Ink will truncate text instead, resulting in one line of text with the rest cut off.

```jsx
<Box width={7}>
	<Text>Hello World</Text>
</Box>
//=> 'Hello\nWorld'

// `truncate` is an alias to `truncate-end`
<Box width={7}>
	<Text wrap="truncate">Hello World</Text>
</Box>
//=> 'Hello…'

<Box width={7}>
	<Text wrap="truncate-middle">Hello World</Text>
</Box>
//=> 'He…ld'

<Box width={7}>
	<Text wrap="truncate-start">Hello World</Text>
</Box>
//=> '…World'
```

### `<Box>`

`<Box>` is an essential Ink component to build your layout.
It's like `<div style="display: flex">` in the browser.

```jsx
import {render, Box, Text} from 'ink';

const Example = () => (
	<Box margin={2}>
		<Text>This is a box with margin</Text>
	</Box>
);

render(<Example />);
```

#### Dimensions

##### width

Type: `number` `string`

Width of the element in spaces.
You can also set it as a percentage, which will calculate the width based on the width of the parent element.

```jsx
<Box width={4}>
	<Text>X</Text>
</Box>
//=> 'X   '
```

```jsx
<Box width={10}>
	<Box width="50%">
		<Text>X</Text>
	</Box>
	<Text>Y</Text>
</Box>
//=> 'X    Y'
```

##### height

Type: `number` `string`

Height of the element in lines (rows).
You can also set it as a percentage, which will calculate the height based on the height of the parent element.

```jsx
<Box height={4}>
	<Text>X</Text>
</Box>
//=> 'X\n\n\n'
```

```jsx
<Box height={6} flexDirection="column">
	<Box height="50%">
		<Text>X</Text>
	</Box>
	<Text>Y</Text>
</Box>
//=> 'X\n\n\nY\n\n'
```

##### minWidth

Type: `number`

Sets a minimum width of the element.
Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.

##### minHeight

Type: `number`

Sets a minimum height of the element.
Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.

#### Padding

##### paddingTop

Type: `number`\
Default: `0`

Top padding.

##### paddingBottom

Type: `number`\
Default: `0`

Bottom padding.

##### paddingLeft

Type: `number`\
Default: `0`

Left padding.

##### paddingRight

Type: `number`\
Default: `0`

Right padding.

##### paddingX

Type: `number`\
Default: `0`

Horizontal padding. Equivalent to setting `paddingLeft` and `paddingRight`.

##### paddingY

Type: `number`\
Default: `0`

Vertical padding. Equivalent to setting `paddingTop` and `paddingBottom`.

##### padding

Type: `number`\
Default: `0`

Padding on all sides. Equivalent to setting `paddingTop`, `paddingBottom`, `paddingLeft` and `paddingRight`.

```jsx
<Box paddingTop={2}>Top</Box>
<Box paddingBottom={2}>Bottom</Box>
<Box paddingLeft={2}>Left</Box>
<Box paddingRight={2}>Right</Box>
<Box paddingX={2}>Left and right</Box>
<Box paddingY={2}>Top and bottom</Box>
<Box padding={2}>Top, bottom, left and right</Box>
```

#### Margin

##### marginTop

Type: `number`\
Default: `0`

Top margin.

##### marginBottom

Type: `number`\
Default: `0`

Bottom margin.

##### marginLeft

Type: `number`\
Default: `0`

Left margin.

##### marginRight

Type: `number`\
Default: `0`

Right margin.

##### marginX

Type: `number`\
Default: `0`

Horizontal margin. Equivalent to setting `marginLeft` and `marginRight`.

##### marginY

Type: `number`\
Default: `0`

Vertical margin. Equivalent to setting `marginTop` and `marginBottom`.

##### margin

Type: `number`\
Default: `0`

Margin on all sides. Equivalent to setting `marginTop`, `marginBottom`, `marginLeft` and `marginRight`.

```jsx
<Box marginTop={2}>Top</Box>
<Box marginBottom={2}>Bottom</Box>
<Box marginLeft={2}>Left</Box>
<Box marginRight={2}>Right</Box>
<Box marginX={2}>Left and right</Box>
<Box marginY={2}>Top and bottom</Box>
<Box margin={2}>Top, bottom, left and right</Box>
```

#### Gap

#### gap

Type: `number`\
Default: `0`

Size of the gap between an element's columns and rows. A shorthand for `columnGap` and `rowGap`.

```jsx
<Box gap={1} width={3} flexWrap="wrap">
	<Text>A</Text>
	<Text>B</Text>
	<Text>C</Text>
</Box>
// A B
//
// C
```

#### columnGap

Type: `number`\
Default: `0`

Size of the gap between an element's columns.

```jsx
<Box columnGap={1}>
	<Text>A</Text>
	<Text>B</Text>
</Box>
// A B
```

#### rowGap

Type: `number`\
Default: `0`

Size of the gap between an element's rows.

```jsx
<Box flexDirection="column" rowGap={1}>
	<Text>A</Text>
	<Text>B</Text>
</Box>
// A
//
// B
```

#### Flex

##### flexGrow

Type: `number`\
Default: `0`

See [flex-grow](https://css-tricks.com/almanac/properties/f/flex-grow/).

```jsx
<Box>
	<Text>Label:</Text>
	<Box flexGrow={1}>
		<Text>Fills all remaining space</Text>
	</Box>
</Box>
```

##### flexShrink

Type: `number`\
Default: `1`

See [flex-shrink](https://css-tricks.com/almanac/properties/f/flex-shrink/).

```jsx
<Box width={20}>
	<Box flexShrink={2} width={10}>
		<Text>Will be 1/4</Text>
	</Box>
	<Box width={10}>
		<Text>Will be 3/4</Text>
	</Box>
</Box>
```

##### flexBasis

Type: `number` `string`

See [flex-basis](https://css-tricks.com/almanac/properties/f/flex-basis/).

```jsx
<Box width={6}>
	<Box flexBasis={3}>
		<Text>X</Text>
	</Box>
	<Text>Y</Text>
</Box>
//=> 'X  Y'
```

```jsx
<Box width={6}>
	<Box flexBasis="50%">
		<Text>X</Text>
	</Box>
	<Text>Y</Text>
</Box>
//=> 'X  Y'
```

##### flexDirection

Type: `string`\
Allowed values: `row` `row-reverse` `column` `column-reverse`

See [flex-direction](https://css-tricks.com/almanac/properties/f/flex-direction/).

```jsx
<Box>
	<Box marginRight={1}>
		<Text>X</Text>
	</Box>
	<Text>Y</Text>
</Box>
// X Y

<Box flexDirection="row-reverse">
	<Text>X</Text>
	<Box marginRight={1}>
		<Text>Y</Text>
	</Box>
</Box>
// Y X

<Box flexDirection="column">
	<Text>X</Text>
	<Text>Y</Text>
</Box>
// X
// Y

<Box flexDirection="column-reverse">
	<Text>X</Text>
	<Text>Y</Text>
</Box>
// Y
// X
```

##### flexWrap

Type: `string`\
Allowed values: `nowrap` `wrap` `wrap-reverse`

See [flex-wrap](https://css-tricks.com/almanac/properties/f/flex-wrap/).

```jsx
<Box width={2} flexWrap="wrap">
	<Text>A</Text>
	<Text>BC</Text>
</Box>
// A
// B C
```

```jsx
<Box flexDirection="column" height={2} flexWrap="wrap">
	<Text>A</Text>
	<Text>B</Text>
	<Text>C</Text>
</Box>
// A C
// B
```

##### alignItems

Type: `string`\
Allowed values: `flex-start` `center` `flex-end`

See [align-items](https://css-tricks.com/almanac/properties/a/align-items/).

```jsx
<Box alignItems="flex-start">
	<Box marginRight={1}>
		<Text>X</Text>
	</Box>
	<Text>
		A
		<Newline/>
		B
		<Newline/>
		C
	</Text>
</Box>
// X A
//   B
//   C

<Box alignItems="center">
	<Box marginRight={1}>
		<Text>X</Text>
	</Box>
	<Text>
		A
		<Newline/>
		B
		<Newline/>
		C
	</Text>
</Box>
//   A
// X B
//   C

<Box alignItems="flex-end">
	<Box marginRight={1}>
		<Text>X</Text>
	</Box>
	<Text>
		A
		<Newline/>
		B
		<Newline/>
		C
	</Text>
</Box>
//   A
//   B
// X C
```

##### alignSelf

Type: `string`\
Default: `auto`\
Allowed values: `auto` `flex-start` `center` `flex-end`

See [align-self](https://css-tricks.com/almanac/properties/a/align-self/).

```jsx
<Box height={3}>
	<Box alignSelf="flex-start">
		<Text>X</Text>
	</Box>
</Box>
// X
//
//

<Box height={3}>
	<Box alignSelf="center">
		<Text>X</Text>
	</Box>
</Box>
//
// X
//

<Box height={3}>
	<Box alignSelf="flex-end">
		<Text>X</Text>
	</Box>
</Box>
//
//
// X
```

##### justifyContent

Type: `string`\
Allowed values: `flex-start` `center` `flex-end` `space-between` `space-around` `space-evenly`

See [justify-content](https://css-tricks.com/almanac/properties/j/justify-content/).

```jsx
<Box justifyContent="flex-start">
	<Text>X</Text>
</Box>
// [X      ]

<Box justifyContent="center">
	<Text>X</Text>
</Box>
// [   X   ]

<Box justifyContent="flex-end">
	<Text>X</Text>
</Box>
// [      X]

<Box justifyContent="space-between">
	<Text>X</Text>
	<Text>Y</Text>
</Box>
// [X      Y]

<Box justifyContent="space-around">
	<Text>X</Text>
	<Text>Y</Text>
</Box>
// [  X   Y  ]

<Box justifyContent="space-evenly">
	<Text>X</Text>
	<Text>Y</Text>
</Box>
// [   X   Y   ]
```

#### Visibility

##### display

Type: `string`\
Allowed values: `flex` `none`\
Default: `flex`

Set this property to `none` to hide the element.

##### overflowX

Type: `string`\
Allowed values: `visible` `hidden`\
Default: `visible`

Behavior for an element's overflow in the horizontal direction.

##### overflowY

Type: `string`\
Allowed values: `visible` `hidden`\
Default: `visible`

Behavior for an element's overflow in the vertical direction.

##### overflow

Type: `string`\
Allowed values: `visible` `hidden`\
Default: `visible`

A shortcut for setting `overflowX` and `overflowY` at the same time.

#### Borders

##### borderStyle

Type: `string`\
Allowed values: `single` `double` `round` `bold` `singleDouble` `doubleSingle` `classic` | `BoxStyle`

Add a border with a specified style.
If `borderStyle` is `undefined` (the default), no border will be added.
Ink uses border styles from the [`cli-boxes`](https://github.com/sindresorhus/cli-boxes) module.

```jsx
<Box flexDirection="column">
	<Box>
		<Box borderStyle="single" marginRight={2}>
			<Text>single</Text>
		</Box>

		<Box borderStyle="double" marginRight={2}>
			<Text>double</Text>
		</Box>

		<Box borderStyle="round" marginRight={2}>
			<Text>round</Text>
		</Box>

		<Box borderStyle="bold">
			<Text>bold</Text>
		</Box>
	</Box>

	<Box marginTop={1}>
		<Box borderStyle="singleDouble" marginRight={2}>
			<Text>singleDouble</Text>
		</Box>

		<Box borderStyle="doubleSingle" marginRight={2}>
			<Text>doubleSingle</Text>
		</Box>

		<Box borderStyle="classic">
			<Text>classic</Text>
		</Box>
	</Box>
</Box>
```

<img src="media/box-borderStyle.jpg" width="521">

Alternatively, pass a custom border style like so:

```jsx
<Box
	borderStyle={{
		topLeft: '↘',
		top: '↓',
		topRight: '↙',
		left: '→',
		bottomLeft: '↗',
		bottom: '↑',
		bottomRight: '↖',
		right: '←'
	}}
>
	<Text>Custom</Text>
</Box>
```

See example in [examples/borders](examples/borders/borders.tsx).

##### borderColor

Type: `string`

Change border color.
A shorthand for setting `borderTopColor`, `borderRightColor`, `borderBottomColor`, and `borderLeftColor`.

```jsx
<Box borderStyle="round" borderColor="green">
	<Text>Green Rounded Box</Text>
</Box>
```

<img src="media/box-borderColor.jpg" width="228">

##### borderTopColor

Type: `string`

Change top border color.
Accepts the same values as [`color`](#color) in `<Text>` component.

```jsx
<Box borderStyle="round" borderTopColor="green">
	<Text>Hello world</Text>
</Box>
```

##### borderRightColor

Type: `string`

Change right border color.
Accepts the same values as [`color`](#color) in `<Text>` component.

```jsx
<Box borderStyle="round" borderRightColor="green">
	<Text>Hello world</Text>
</Box>
```

##### borderBottomColor

Type: `string`

Change bottom border color.
Accepts the same values as [`color`](#color) in `<Text>` component.

```jsx
<Box borderStyle="round" borderBottomColor="green">
	<Text>Hello world</Text>
</Box>
```

##### borderLeftColor

Type: `string`

Change left border color.
Accepts the same values as [`color`](#color) in `<Text>` component.

```jsx
<Box borderStyle="round" borderLeftColor="green">
	<Text>Hello world</Text>
</Box>
```

##### borderDimColor

Type: `boolean`\
Default: `false`

Dim the border color.
A shorthand for setting `borderTopDimColor`, `borderBottomDimColor`, `borderLeftDimColor`, and `borderRightDimColor`.

```jsx
<Box borderStyle="round" borderDimColor>
	<Text>Hello world</Text>
</Box>
```

##### borderTopDimColor

Type: `boolean`\
Default: `false`

Dim the top border color.

```jsx
<Box borderStyle="round" borderTopDimColor>
	<Text>Hello world</Text>
</Box>
```

##### borderBottomDimColor

Type: `boolean`\
Default: `false`

Dim the bottom border color.

```jsx
<Box borderStyle="round" borderBottomDimColor>
	<Text>Hello world</Text>
</Box>
```

##### borderLeftDimColor

Type: `boolean`\
Default: `false`

Dim the left border color.

```jsx
<Box borderStyle="round" borderLeftDimColor>
	<Text>Hello world</Text>
</Box>
```

##### borderRightDimColor

Type: `boolean`\
Default: `false`

Dim the right border color.

```jsx
<Box borderStyle="round" borderRightDimColor>
	<Text>Hello world</Text>
</Box>
```

##### borderTop

Type: `boolean`\
Default: `true`

Determines whether top border is visible.

##### borderRight

Type: `boolean`\
Default: `true`

Determines whether right border is visible.

##### borderBottom

Type: `boolean`\
Default: `true`

Determines whether bottom border is visible.

##### borderLeft

Type: `boolean`\
Default: `true`

Determines whether left border is visible.

#### Background

##### backgroundColor

Type: `string`

Background color for the element.

Accepts the same values as [`color`](#color) in the `<Text>` component.

```jsx
<Box flexDirection="column">
	<Box backgroundColor="red" width={20} height={5} alignSelf="flex-start">
		<Text>Red background</Text>
	</Box>

	<Box backgroundColor="#FF8800" width={20} height={3} marginTop={1} alignSelf="flex-start">
		<Text>Orange background</Text>
	</Box>

	<Box backgroundColor="rgb(0, 255, 0)" width={20} height={3} marginTop={1} alignSelf="flex-start">
		<Text>Green background</Text>
	</Box>
</Box>
```

The background color fills the entire `<Box>` area and is inherited by child `<Text>` components unless they specify their own `backgroundColor`.

```jsx
<Box backgroundColor="blue" alignSelf="flex-start">
	<Text>Blue inherited </Text>
	<Text backgroundColor="yellow">Yellow override </Text>
	<Text>Blue inherited again</Text>
</Box>
```

Background colors work with borders and padding:

```jsx
<Box backgroundColor="cyan" borderStyle="round" padding={1} alignSelf="flex-start">
	<Text>Background with border and padding</Text>
</Box>
```

See example in [examples/box-backgrounds](examples/box-backgrounds/box-backgrounds.tsx).

### `<Newline>`

Adds one or more newline (`\n`) characters.
Must be used within `<Text>` components.

#### count

Type: `number`\
Default: `1`

Number of newlines to insert.

```jsx
import {render, Text, Newline} from 'ink';

const Example = () => (
	<Text>
		<Text color="green">Hello</Text>
		<Newline />
		<Text color="red">World</Text>
	</Text>
);

render(<Example />);
```

Output:

```
Hello
World
```

### `<Spacer>`

A flexible space that expands along the major axis of its containing layout.
It's useful as a shortcut for filling all the available space between elements.

For example, using `<Spacer>` in a `<Box>` with default flex direction (`row`) will position "Left" on the left side and will push "Right" to the right side.

```jsx
import {render, Box, Text, Spacer} from 'ink';

const Example = () => (
	<Box>
		<Text>Left</Text>
		<Spacer />
		<Text>Right</Text>
	</Box>
);

render(<Example />);
```

In a vertical flex direction (`column`), it will position "Top" at the top of the container and push "Bottom" to the bottom.
Note that the container needs to be tall enough to see this in effect.

```jsx
import {render, Box, Text, Spacer} from 'ink';

const Example = () => (
	<Box flexDirection="column" height={10}>
		<Text>Top</Text>
		<Spacer />
		<Text>Bottom</Text>
	</Box>
);

render(<Example />);
```

### `<Static>`

`<Static>` component permanently renders its output above everything else.
It's useful for displaying activity like completed tasks or logs - things that
don't change after they're rendered (hence the name "Static").

It's preferred to use `<Static>` for use cases like these when you can't know
or control the number of items that need to be rendered.

For example, [Tap](https://github.com/tapjs/node-tap) uses `<Static>` to display
a list of completed tests. [Gatsby](https://github.com/gatsbyjs/gatsby) uses it
to display a list of generated pages while still displaying a live progress bar.

```jsx
import React, {useState, useEffect} from 'react';
import {render, Static, Box, Text} from 'ink';

const Example = () => {
	const [tests, setTests] = useState([]);

	useEffect(() => {
		let completedTests = 0;
		let timer;

		const run = () => {
			// Fake 10 completed tests
			if (completedTests++ < 10) {
				setTests(previousTests => [
					...previousTests,
					{
						id: previousTests.length,
						title: `Test #${previousTests.length + 1}`
					}
				]);

				timer = setTimeout(run, 100);
			}
		};

		run();

		return () => {
			clearTimeout(timer);
		};
	}, []);

	return (
		<>
			{/* This part will be rendered once to the terminal */}
			<Static items={tests}>
				{test => (
					<Box key={test.id}>
						<Text color="green">✔ {test.title}</Text>
					</Box>
				)}
			</Static>

			{/* This part keeps updating as state changes */}
			<Box marginTop={1}>
				<Text dimColor>Completed tests: {tests.length}</Text>
			</Box>
		</>
	);
};

render(<Example />);
```

**Note:** `<Static>` only renders new items in the `items` prop and ignores items
that were previously rendered. This means that when you add new items to the `items`
array, changes you make to previous items will not trigger a rerender.

See [examples/static](examples/static/static.tsx) for an example usage of `<Static>` component.

#### items

Type: `Array`

Array of items of any type to render using the function you pass as a component child.

#### style

Type: `object`

Styles to apply to a container of child elements.
See [`<Box>`](#box) for supported properties.

```jsx
<Static items={...} style={{padding: 1}}>
	{...}
</Static>
```

#### children(item)

Type: `Function`

Function that is called to render every item in the `items` array.
The first argument is the item itself, and the second argument is the index of that item in the
`items` array.

Note that a `key` must be assigned to the root component.

```jsx
<Static items={['a', 'b', 'c']}>
	{(item, index) => {
		// This function is called for every item in ['a', 'b', 'c']
		// `item` is 'a', 'b', 'c'
		// `index` is 0, 1, 2
		return (
			<Box key={index}>
				<Text>Item: {item}</Text>
			</Box>
		);
	}}
</Static>
```

### `<Transform>`

Transform a string representation of React components before they're written to output.
For example, you might want to apply a [gradient to text](https://github.com/sindresorhus/ink-gradient), [add a clickable link](https://github.com/sindresorhus/ink-link), or [create some text effects](https://github.com/sindresorhus/ink-big-text).
These use cases can't accept React nodes as input; they expect a string.
That's what the `<Transform>` component does: it gives you an output string of its child components and lets you transform it in any way.

**Note:** `<Transform>` must be applied only to `<Text>` children components and shouldn't change the dimensions of the output; otherwise, the layout will be incorrect.

```jsx
import {render, Transform} from 'ink';

const Example = () => (
	<Transform transform={output => output.toUpperCase()}>
		<Text>Hello World</Text>
	</Transform>
);

render(<Example />);
```

Since the `transform` function converts all characters to uppercase, the final output rendered to the terminal will be "HELLO WORLD", not "Hello World".

When the output wraps to multiple lines, it can be helpful to know which line is being processed.

For example, to implement a hanging indent component, you can indent all the lines except for the first.

```jsx
import {render, Transform} from 'ink';

const HangingIndent = ({content, indent = 4, children, ...props}) => (
	<Transform
		transform={(line, index) =>
			index === 0 ? line : ' '.repeat(indent) + line
		}
		{...props}
	>
		{children}
	</Transform>
);

const text =
	'WHEN I WROTE the following pages, or rather the bulk of them, ' +
	'I lived alone, in the woods, a mile from any neighbor, in a ' +
	'house which I had built myself, on the shore of Walden Pond, ' +
	'in Concord, Massachusetts, and earned my living by the labor ' +
	'of my hands only. I lived there two years and two months. At ' +
	'present I am a sojourner in civilized life again.';

// Other text properties are allowed as well
render(
	<HangingIndent bold dimColor indent={4}>
		{text}
	</HangingIndent>
);
```

#### transform(outputLine, index)

Type: `Function`

Function that transforms children output.
It accepts children and must return transformed children as well.

##### children

Type: `string`

Output of child components.

##### index

Type: `number`

The zero-indexed line number of the line that's currently being transformed.

## Hooks

### useInput(inputHandler, options?)

This hook is used for handling user input.
It's a more convenient alternative to using `useStdin` and listening for `data` events.
The callback you pass to `useInput` is called for each character when the user enters any input.
However, if the user pastes text and it's more than one character, the callback will be called only once, and the whole string will be passed as `input`.
You can find a full example of using `useInput` at [examples/use-input](examples/use-input/use-input.tsx).

```jsx
import {useInput} from 'ink';

const UserInput = () => {
	useInput((input, key) => {
		if (input === 'q') {
			// Exit program
		}

		if (key.leftArrow) {
			// Left arrow key pressed
		}
	});

	return …
};
```

#### inputHandler(input, key)

Type: `Function`

The handler function that you pass to `useInput` receives two arguments:

##### input

Type: `string`

The input that the program received.

##### key

Type: `object`

Handy information about a key that was pressed.

###### key.leftArrow

###### key.rightArrow

###### key.upArrow

###### key.downArrow

Type: `boolean`\
Default: `false`

If an arrow key was pressed, the corresponding property will be `true`.
For example, if the user presses the left arrow key, `key.leftArrow` equals `true`.

###### key.return

Type: `boolean`\
Default: `false`

Return (Enter) key was pressed.

###### key.escape

Type: `boolean`\
Default: `false`

Escape key was pressed.

###### key.ctrl

Type: `boolean`\
Default: `false`

Ctrl key was pressed.

###### key.shift

Type: `boolean`\
Default: `false`

Shift key was pressed.

###### key.tab

Type: `boolean`\
Default: `false`

Tab key was pressed.

###### key.backspace

Type: `boolean`\
Default: `false`

Backspace key was pressed.

###### key.delete

Type: `boolean`\
Default: `false`

Delete key was pressed.

###### key.pageDown

###### key.pageUp

Type: `boolean`\
Default: `false`

If the Page Up or Page Down key was pressed, the corresponding property will be `true`.
For example, if the user presses Page Down, `key.pageDown` equals `true`.

###### key.meta

Type: `boolean`\
Default: `false`

[Meta key](https://en.wikipedia.org/wiki/Meta_key) was pressed.

#### options

Type: `object`

##### isActive

Type: `boolean`\
Default: `true`

Enable or disable capturing of user input.
Useful when there are multiple `useInput` hooks used at once to avoid handling the same input several times.

### useApp()

`useApp` is a React hook that exposes a method to manually exit the app (unmount).

#### exit(error?)

Type: `Function`

Exit (unmount) the whole Ink app.

##### error

Type: `Error`

Optional error. If passed, [`waitUntilExit`](waituntilexit) will reject with that error.

```js
import {useApp} from 'ink';

const Example = () => {
	const {exit} = useApp();

	// Exit the app after 5 seconds
	useEffect(() => {
		setTimeout(() => {
			exit();
		}, 5000);
	}, []);

	return …
};
```

### useStdin()

`useStdin` is a React hook that exposes the stdin stream.

#### stdin

Type: `stream.Readable`\
Default: `process.stdin`

The stdin stream passed to `render()` in `options.stdin`, or `process.stdin` by default.
Useful if your app needs to handle user input.

```js
import {useStdin} from 'ink';

const Example = () => {
	const {stdin} = useStdin();

	return …
};
```

#### isRawModeSupported

Type: `boolean`

A boolean flag determining if the current `stdin` supports `setRawMode`.
A component using `setRawMode` might want to use `isRawModeSupported` to nicely fall back in environments where raw mode is not supported.

```jsx
import {useStdin} from 'ink';

const Example = () => {
	const {isRawModeSupported} = useStdin();

	return isRawModeSupported ? (
		<MyInputComponent />
	) : (
		<MyComponentThatDoesntUseInput />
	);
};
```

#### setRawMode(isRawModeEnabled)

Type: `function`

##### isRawModeEnabled

Type: `boolean`

See [`setRawMode`](https://nodejs.org/api/tty.html#tty_readstream_setrawmode_mode).
Ink exposes this function to be able to handle <kbd>Ctrl</kbd>+<kbd>C</kbd>, that's why you should use Ink's `setRawMode` instead of `process.stdin.setRawMode`.

**Warning:** This function will throw unless the current `stdin` supports `setRawMode`. Use [`isRawModeSupported`](#israwmodesupported) to detect `setRawMode` support.

```js
import {useStdin} from 'ink';

const Example = () => {
	const {setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);

		return () => {
			setRawMode(false);
		};
	});

	return …
};
```

### useStdout()

`useStdout` is a React hook that exposes the stdout stream where Ink renders your app.

#### stdout

Type: `stream.Writable`\
Default: `process.stdout`

```js
import {useStdout} from 'ink';

const Example = () => {
	const {stdout} = useStdout();

	return …
};
```

#### write(data)

Write any string to stdout while preserving Ink's output.
It's useful when you want to display external information outside of Ink's rendering and ensure there's no conflict between the two.
It's similar to `<Static>`, except it can't accept components; it only works with strings.

##### data

Type: `string`

Data to write to stdout.

```js
import {useStdout} from 'ink';

const Example = () => {
	const {write} = useStdout();

	useEffect(() => {
		// Write a single message to stdout, above Ink's output
		write('Hello from Ink to stdout\n');
	}, []);

	return …
};
```

See additional usage example in [examples/use-stdout](examples/use-stdout/use-stdout.tsx).

### useStderr()

`useStderr` is a React hook that exposes the stderr stream.

#### stderr

Type: `stream.Writable`\
Default: `process.stderr`

Stderr stream.

```js
import {useStderr} from 'ink';

const Example = () => {
	const {stderr} = useStderr();

	return …
};
```

#### write(data)

Write any string to stderr while preserving Ink's output.

It's useful when you want to display external information outside of Ink's rendering and ensure there's no conflict between the two.
It's similar to `<Static>`, except it can't accept components; it only works with strings.

##### data

Type: `string`

Data to write to stderr.

```js
import {useStderr} from 'ink';

const Example = () => {
	const {write} = useStderr();

	useEffect(() => {
		// Write a single message to stderr, above Ink's output
		write('Hello from Ink to stderr\n');
	}, []);

	return …
};
```

### useFocus(options?)

A component that uses the `useFocus` hook becomes "focusable" to Ink, so when the user presses <kbd>Tab</kbd>, Ink will switch focus to this component.
If there are multiple components that execute the `useFocus` hook, focus will be given to them in the order in which these components are rendered.
This hook returns an object with an `isFocused` boolean property, which determines whether this component is focused.

#### options

##### autoFocus

Type: `boolean`\
Default: `false`

Auto-focus this component if there's no active (focused) component right now.

##### isActive

Type: `boolean`\
Default: `true`

Enable or disable this component's focus, while still maintaining its position in the list of focusable components.
This is useful for inputs that are temporarily disabled.

##### id

Type: `string`\
Required: `false`

Set a component's focus ID, which can be used to programmatically focus the component. This is useful for large interfaces with many focusable elements to avoid having to cycle through all of them.

```jsx
import {render, useFocus, Text} from 'ink';

const Example = () => {
	const {isFocused} = useFocus();

	return <Text>{isFocused ? 'I am focused' : 'I am not focused'}</Text>;
};

render(<Example />);
```

See example in [examples/use-focus](examples/use-focus/use-focus.tsx) and [examples/use-focus-with-id](examples/use-focus-with-id/use-focus-with-id.tsx).

### useFocusManager()

This hook exposes methods to enable or disable focus management for all components or manually switch focus to next or previous components.

#### enableFocus()

Enable focus management for all components.

**Note:** You don't need to call this method manually unless you've disabled focus management. Focus management is enabled by default.

```js
import {useFocusManager} from 'ink';

const Example = () => {
	const {enableFocus} = useFocusManager();

	useEffect(() => {
		enableFocus();
	}, []);

	return …
};
```

#### disableFocus()

Disable focus management for all components.
The currently active component (if there's one) will lose its focus.

```js
import {useFocusManager} from 'ink';

const Example = () => {
	const {disableFocus} = useFocusManager();

	useEffect(() => {
		disableFocus();
	}, []);

	return …
};
```

#### focusNext()

Switch focus to the next focusable component.
If there's no active component right now, focus will be given to the first focusable component.
If the active component is the last in the list of focusable components, focus will be switched to the first focusable component.

**Note:** Ink calls this method when user presses <kbd>Tab</kbd>.

```js
import {useFocusManager} from 'ink';

const Example = () => {
	const {focusNext} = useFocusManager();

	useEffect(() => {
		focusNext();
	}, []);

	return …
};
```

#### focusPrevious()

Switch focus to the previous focusable component.
If there's no active component right now, focus will be given to the first focusable component.
If the active component is the first in the list of focusable components, focus will be switched to the last focusable component.

**Note:** Ink calls this method when user presses <kbd>Shift</kbd>+<kbd>Tab</kbd>.

```js
import {useFocusManager} from 'ink';

const Example = () => {
	const {focusPrevious} = useFocusManager();

	useEffect(() => {
		focusPrevious();
	}, []);

	return …
};
```

#### focus(id)

##### id

Type: `string`

Switch focus to the component with the given [`id`](#id).
If there's no component with that ID, focus will be given to the next focusable component.

```js
import {useFocusManager, useInput} from 'ink';

const Example = () => {
	const {focus} = useFocusManager();

	useInput(input => {
		if (input === 's') {
			// Focus the component with focus ID 'someId'
			focus('someId');
		}
	});

	return …
};
```

### useIsScreenReaderEnabled()

Returns whether a screen reader is enabled. This is useful when you want to render different output for screen readers.

```jsx
import {useIsScreenReaderEnabled, Text} from 'ink';

const Example = () => {
	const isScreenReaderEnabled = useIsScreenReaderEnabled();

	return (
		<Text>
			{isScreenReaderEnabled
				? 'Screen reader is enabled'
				: 'Screen reader is disabled'}
		</Text>
	);
};
```

## API

#### render(tree, options?)

Returns: [`Instance`](#instance)

Mount a component and render the output.

##### tree

Type: `ReactElement`

##### options

Type: `object`

###### stdout

Type: `stream.Writable`\
Default: `process.stdout`

Output stream where app will be rendered.

###### stdin

Type: `stream.Readable`\
Default: `process.stdin`

Input stream where app will listen for input.

###### exitOnCtrlC

Type: `boolean`\
Default: `true`

Configure whether Ink should listen for Ctrl+C keyboard input and exit the app.
This is needed in case `process.stdin` is in [raw mode](https://nodejs.org/api/tty.html#tty_readstream_setrawmode_mode), because then Ctrl+C is ignored by default and the process is expected to handle it manually.

###### patchConsole

Type: `boolean`\
Default: `true`

Patch console methods to ensure console output doesn't mix with Ink's output.
When any of the `console.*` methods are called (like `console.log()`), Ink intercepts their output, clears the main output, renders output from the console method, and then rerenders the main output again.
That way, both are visible and don't overlap each other.

This functionality is powered by [patch-console](https://github.com/vadimdemedes/patch-console), so if you need to disable Ink's interception of output but want to build something custom, you can use that.

###### debug

Type: `boolean`\
Default: `false`

If `true`, each update will be rendered as separate output, without replacing the previous one.

###### maxFps

Type: `number`\
Default: `30`

Maximum frames per second for render updates.
This controls how frequently the UI can update to prevent excessive re-rendering.
Higher values allow more frequent updates but may impact performance.
Setting it to a lower value may be useful for components that update very frequently, to reduce CPU usage.

#### Instance

This is the object that `render()` returns.

##### rerender(tree)

Replace the previous root node with a new one or update props of the current root node.

###### tree

Type: `ReactElement`

```jsx
// Update props of the root node
const {rerender} = render(<Counter count={1} />);
rerender(<Counter count={2} />);

// Replace root node
const {rerender} = render(<OldCounter />);
rerender(<NewCounter />);
```

##### unmount()

Manually unmount the whole Ink app.

```jsx
const {unmount} = render(<MyApp />);
unmount();
```

##### waitUntilExit()

Returns a promise that resolves when the app is unmounted.

```jsx
const {unmount, waitUntilExit} = render(<MyApp />);

setTimeout(unmount, 1000);

await waitUntilExit(); // resolves after `unmount()` is called
```

##### clear()

Clear output.

```jsx
const {clear} = render(<MyApp />);
clear();
```

#### measureElement(ref)

Measure the dimensions of a particular `<Box>` element.
Returns an object with `width` and `height` properties.
This function is useful when your component needs to know the amount of available space it has. You can use it when you need to change the layout based on the length of its content.

**Note:** `measureElement()` returns correct results only after the initial render, when the layout has been calculated. Until then, `width` and `height` equal zero. It's recommended to call `measureElement()` in a `useEffect` hook, which fires after the component has rendered.

##### ref

Type: `MutableRef`

A reference to a `<Box>` element captured with the `ref` property.
See [Refs](https://reactjs.org/docs/refs-and-the-dom.html) for more information on how to capture references.

```jsx
import {render, measureElement, Box, Text} from 'ink';

const Example = () => {
	const ref = useRef();

	useEffect(() => {
		const {width, height} = measureElement(ref.current);
		// width = 100, height = 1
	}, []);

	return (
		<Box width={100}>
			<Box ref={ref}>
				<Text>This box will stretch to 100 width</Text>
			</Box>
		</Box>
	);
};

render(<Example />);
```

## Testing

Ink components are simple to test with [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library).
Here's a simple example that checks how component is rendered:

```jsx
import React from 'react';
import {Text} from 'ink';
import {render} from 'ink-testing-library';

const Test = () => <Text>Hello World</Text>;
const {lastFrame} = render(<Test />);

lastFrame() === 'Hello World'; //=> true
```

Check out [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) for more examples and full documentation.

## Using React Devtools

![](media/devtools.jpg)

Ink supports [React Devtools](https://github.com/facebook/react/tree/master/packages/react-devtools) out of the box. To enable integration with React Devtools in your Ink-based CLI, first ensure you have installed the optional `react-devtools-core` dependency, and then run your app with the `DEV=true` environment variable:

```sh
DEV=true my-cli
```

Then, start React Devtools itself:

```sh
npx react-devtools
```

After it starts, you should see the component tree of your CLI.
You can even inspect and change the props of components, and see the results immediately in the CLI, without restarting it.

**Note**: You must manually quit your CLI via <kbd>Ctrl</kbd>+<kbd>C</kbd> after you're done testing.

## Screen Reader Support

Ink has basic support for screen readers.

To enable it, you can either pass the `isScreenReaderEnabled` option to the `render` function or set the `INK_SCREEN_READER` environment variable to `true`.

Ink implements a small subset of functionality from the [ARIA specification](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA).

```jsx
render(<MyApp />, {isScreenReaderEnabled: true});
```

When screen reader support is enabled, Ink will try its best to generate a screen-reader-friendly output.

For example, for this code:

```jsx
<Box aria-role="checkbox" aria-state={{checked: true}}>
	Accept terms and conditions
</Box>
```

Ink will generate the following output for screen readers:

```
(checked) checkbox: Accept terms and conditions
```

You can also provide a custom label for screen readers if you want to render something different for them.

For example, if you are building a progress bar, you can use `aria-label` to provide a more descriptive label for screen readers.

```jsx
<Box>
	<Box width="50%" height={1} backgroundColor="green" />
	<Text aria-label="Progress: 50%">50%</Text>
</Box>
```

In the example above, the screen reader will read "Progress: 50%" instead of "50%".

### `aria-label`

Type: `string`

A label for the element for screen readers.

### `aria-hidden`

Type: `boolean`\
Default: `false`

Hide the element from screen readers.

##### aria-role

Type: `string`

The role of the element.

Supported values:
- `button`
- `checkbox`
- `radio`
- `radiogroup`
- `list`
- `listitem`
- `menu`
- `menuitem`
- `progressbar`
- `tab`
- `tablist`
- `timer`
- `toolbar`
- `table`

##### aria-state

Type: `object`

The state of the element.

Supported values:
- `checked` (boolean)
- `disabled` (boolean)
- `expanded` (boolean)
- `selected` (boolean)

## Creating Components

When building custom components, it's important to keep accessibility in mind. While Ink provides the building blocks, ensuring your components are accessible will make your CLIs usable by a wider audience.

### General Principles

- **Provide screen reader-friendly output:** Use the `useIsScreenReaderEnabled` hook to detect if a screen reader is active. You can then render more descriptive output for screen reader users.
- **Leverage ARIA props:** For components that have a specific role (e.g., a checkbox or button), use the `aria-role`, `aria-state`, and `aria-label` props on `<Box>` and `<Text>` to provide semantic meaning to screen readers.

For a practical example of building an accessible component, see the [ARIA example](/examples/aria/aria.tsx).

## Useful Components

- [ink-text-input](https://github.com/vadimdemedes/ink-text-input) - Text input.
- [ink-spinner](https://github.com/vadimdemedes/ink-spinner) - Spinner.
- [ink-select-input](https://github.com/vadimdemedes/ink-select-input) - Select (dropdown) input.
- [ink-link](https://github.com/sindresorhus/ink-link) - Link.
- [ink-gradient](https://github.com/sindresorhus/ink-gradient) - Gradient color.
- [ink-big-text](https://github.com/sindresorhus/ink-big-text) - Awesome text.
- [ink-image](https://github.com/kevva/ink-image) - Display images inside the terminal.
- [ink-tab](https://github.com/jdeniau/ink-tab) - Tab.
- [ink-color-pipe](https://github.com/LitoMore/ink-color-pipe) - Create color text with simpler style strings.
- [ink-multi-select](https://github.com/karaggeorge/ink-multi-select) - Select one or more values from a list
- [ink-divider](https://github.com/JureSotosek/ink-divider) - A divider.
- [ink-progress-bar](https://github.com/brigand/ink-progress-bar) - Progress bar.
- [ink-table](https://github.com/maticzav/ink-table) - Table.
- [ink-ascii](https://github.com/hexrcs/ink-ascii) - Awesome text component with more font choices, based on Figlet.
- [ink-markdown](https://github.com/cameronhunter/ink-markdown) - Render syntax highlighted Markdown.
- [ink-quicksearch-input](https://github.com/Eximchain/ink-quicksearch-input) - Select component with fast, quicksearch-like navigation.
- [ink-confirm-input](https://github.com/kevva/ink-confirm-input) - Yes/No confirmation input.
- [ink-syntax-highlight](https://github.com/vsashyn/ink-syntax-highlight) - Code syntax highlighting.
- [ink-form](https://github.com/lukasbach/ink-form) - Form.
- [ink-task-list](https://github.com/privatenumber/ink-task-list) - Task list.
- [ink-spawn](https://github.com/kraenhansen/ink-spawn) - Spawn child processes.
- [ink-titled-box](https://github.com/mishieck/ink-titled-box) - Box with a title.
- [ink-chart](https://github.com/pppp606/ink-chart) - Sparkline and bar chart.

## Useful Hooks

- [ink-use-stdout-dimensions](https://github.com/cameronhunter/ink-monorepo/tree/master/packages/ink-use-stdout-dimensions) - Subscribe to stdout dimensions.

## Examples

The [`examples`](/examples) directory contains a set of real examples. You can run them with:

```bash
npm run example examples/[example name]
# e.g. npm run example examples/borders
```

- [Jest](examples/jest/jest.tsx) - Implementation of basic Jest UI.
- [Counter](examples/counter/counter.tsx) - A simple counter that increments every 100ms.
- [Form with validation](https://github.com/final-form/rff-cli-example) - Manage form state using [Final Form](https://github.com/final-form/final-form#-final-form).
- [Borders](examples/borders/borders.tsx) - Add borders to the `<Box>` component.
- [Suspense](examples/suspense/suspense.tsx) - Use React Suspense.
- [Table](examples/table/table.tsx) - Renders a table with multiple columns and rows.
- [Focus management](examples/use-focus/use-focus.tsx) - Use the `useFocus` hook to manage focus between components.
- [User input](examples/use-input/use-input.tsx) - Listen for user input.
- [Write to stdout](examples/use-stdout/use-stdout.tsx) - Write to stdout, bypassing main Ink output.
- [Write to stderr](examples/use-stderr/use-stderr.tsx) - Write to stderr, bypassing main Ink output.
- [Static](examples/static/static.tsx) - Use the `<Static>` component to render permanent output.
- [Child process](examples/subprocess-output) - Renders output from a child process.

## Maintainers

- [Vadim Demedes](https://github.com/vadimdemedes)
- [Sindre Sorhus](https://github.com/sindresorhus)
