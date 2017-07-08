# ProgressBar

The ProgressBar component represents progress. See examples/progress.js for an example app.

## Usage

```js
const {h, Text, ProgressBar} = require('ink');

<ProgressBar
	char="x"
	progress={0.5}
	left={5}
	right={0}
	green
/>
```

## Props

### character

The character to use for each item in the ProgressBar. Defaults to █ (block).

### progress

The percentage (between 0 and 1) of progress in the ProgressBar.

### left/right

The number of characters to subtract from each side of the ProgressBar. examples/progress.js demonstrates this. Commonly used if you want text before/after the progress bar on the same line.


### {color}

Pass any chalk colors (e.g. `green`, `bgBlue`), similar to Text.

### ...

Any other props are passed to Text as-is.


