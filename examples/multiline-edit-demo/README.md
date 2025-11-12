# Multi-line Edit Demo

Interactive demo application showcasing IME cursor positioning with multi-line text editing.

## Overview

This demo demonstrates how IME (Input Method Editor) cursor positioning works with multi-line text in terminal applications.

Features:
- Automatic text wrapping at terminal width (80 cells)
- Full-width character support (CJK characters = 2 cells, ASCII = 1 cell)
- Newline character (`\n`) support
- Arrow key navigation (up/down/left/right)

This logic is essential for displaying IME candidate windows at the correct position during CJK text input.

## Running the Demo

### With IME Cursor Positioning (Default)

```bash
npx tsx examples/multiline-edit-demo/multiline-edit-demo.tsx
```

This mode positions the terminal cursor at the actual input location, allowing IME candidate windows to appear correctly.

### Without IME Cursor Positioning (For Comparison)

```bash
ENABLE_IME_CURSOR=false npx tsx examples/multiline-edit-demo/multiline-edit-demo.tsx
```

This mode demonstrates the problem: the terminal cursor stays at the end of output, causing IME candidate windows to appear at the wrong position.

### Controls

- **Type**: Add text at cursor position
- **Enter**: Insert newline
- **Arrow keys**: Move cursor (←→↑↓)
- **Backspace**: Delete character
- **Ctrl+C**: Exit

The visual cursor position is shown as a white inverted character (█) in the box.
Cursor position information (logical position, visual position, line info) is displayed below.

## Running Tests

### Standalone Test Script

Run individual test cases:

```bash
node --loader ts-node/esm examples/multiline-edit-demo/test/multiline-cursor-simple.tsx <test-name>
```

Available test cases:
- `empty-text` - Empty text
- `single-line-end` - End of single line
- `two-lines-second-line` - Second line of text
- `empty-line` - Empty line
- `fullwidth-chars` - Full-width characters
- `mixed-width` - Mixed full-width and half-width
- `cursor-on-newline` - Cursor on newline character
- `multiple-empty-lines` - Multiple empty lines
- `line-start` - Start of line
- `text-start` - Start of text
- `long-line-wrap` - Long line wrapping
- `fullwidth-wrap` - Full-width character wrapping
- `fullwidth-wrap-boundary` - Full-width character at wrap boundary
- `mixed-width-wrap` - Mixed width wrapping
- `cursor-at-wrap-point` - Cursor at wrap point

Example:
```bash
node --loader ts-node/esm examples/multiline-edit-demo/test/multiline-cursor-simple.tsx fullwidth-wrap-boundary
# => PASS: row=1, col=0
```

### AVA Integration Tests

Run all test cases automatically (using node-pty):

```bash
# From project root
npx ava examples/multiline-edit-demo/test/multiline-cursor.test.tsx
```

## Implementation Details

### Cursor Position Calculation Algorithm

1. **Split logical lines into visual lines**
   - Split text by `\n` into logical lines
   - Wrap each logical line at terminal width (80 cells)
   - Use `string-width` to calculate character widths (full-width=2, half-width=1)

2. **Determine visual cursor position**
   - Find visual row from logical cursor position (character index)
   - Calculate visual column (in cells) from position within line

3. **Handle edge cases**
   - Empty lines
   - Cursor on newline character
   - Cursor at wrap boundary
   - Full-width character spanning wrap boundary

## File Structure

```
multiline-edit-demo/
├── README.md                        # This file
├── multiline-edit-demo.tsx          # Interactive demo application
└── test/
    ├── multiline-cursor-simple.tsx  # Standalone test script
    └── multiline-cursor.test.tsx    # AVA integration tests
```
