# Ink IME Cursor Fork

This is a fork of [Ink](https://github.com/vadimdemedes/ink) with IME cursor position support for CJK (Chinese, Japanese, Korean) input.

## Problem

When using Ink-based TUI applications (like Claude Code) in terminals that support IME (Ghostty, iTerm2, etc.), the IME candidate window appears at the wrong position (usually bottom-left of the screen) instead of at the cursor position.

This happens because Ink uses a virtual cursor rendered with inverse text, but doesn't move the terminal's real cursor to the input position. The IME uses the real cursor position (via `firstRect`) to determine where to display the candidate window.

## Solution

This fork adds:

1. **`CURSOR_MARKER`** - An invisible ANSI marker (`\u001B[999m`) that you place at your cursor position
2. **`enableImeCursor`** - A render option that enables cursor position control
3. **Automatic cursor movement** - After rendering, the real cursor moves to the marker position

## Usage

```tsx
import {render, Text, CURSOR_MARKER} from '@koshikawa/ink-ime-cursor';

function InputComponent({value, cursorPosition}) {
  const before = value.slice(0, cursorPosition);
  const cursorChar = value[cursorPosition] || ' ';
  const after = value.slice(cursorPosition + 1);

  return (
    <Text>
      {before}
      {CURSOR_MARKER}
      <Text inverse>{cursorChar}</Text>
      {after}
    </Text>
  );
}

render(<App />, {
  enableImeCursor: true,
});
```

## How It Works

1. Place `CURSOR_MARKER` before your visual cursor in the render tree
2. Ink detects the marker and calculates its screen position (row, col)
3. After rendering, Ink uses ANSI escape sequences to move the real cursor
4. The terminal reports cursor position to IME, which displays candidates correctly

### CJK Character Width

The position calculation correctly handles CJK characters (which are 2 cells wide) using `string-width`.

### ANSI Escape Sequences Used

| Sequence | Name | Purpose |
|----------|------|---------|
| `\u001B[999m` | SGR 999 | Cursor marker (no visual effect) |
| `\u001B[?25h` | DECTCEM | Show cursor |
| `\u001B[?25l` | DECTCEM | Hide cursor |
| `\u001B[nA` | CUU | Move cursor up n rows |
| `\u001B[nB` | CUD | Move cursor down n rows |
| `\u001B[nC` | CUF | Move cursor forward n cols |
| `\u001B[nD` | CUB | Move cursor back n cols |

## API Changes

### New Exports

```typescript
// Cursor marker constant
export const CURSOR_MARKER: string;

// Cursor position type
export type CursorPosition = {
  row: number;  // 0-indexed
  col: number;  // 0-indexed, CJK = 2 cells
};
```

### New Render Option

```typescript
render(<App />, {
  // ... other options
  enableImeCursor: true,  // Enable IME cursor positioning
});
```

## Compatibility

- Tested with Ghostty, iTerm2
- Works with Japanese, Chinese, Korean IME
- Backward compatible - disabled by default

## Running the Demo

```bash
npm install
npm run example examples/ime-cursor.tsx
```

## Related

- [Ink PR #803](https://github.com/vadimdemedes/ink/pull/803)
- [Claude Code Issue #16372](https://github.com/anthropics/claude-code/issues/16372)
- [Ghostty PR #8492](https://github.com/ghostty-org/ghostty/pull/8492)
