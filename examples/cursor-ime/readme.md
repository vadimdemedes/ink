# IME-Compatible TextInput for Ink

## Why CJK input needs special handling

Korean, Japanese, and Chinese use **Input Method Editors (IME)** to compose
characters. Unlike Latin keyboards where each keypress produces a character
immediately, CJK input goes through a multi-step composition process.

### How Hangul composition works

When a Korean user types the word "한":

1. Press `ㅎ` — the IME shows the uncommitted consonant **ㅎ**
2. Press `ㅏ` — the IME *replaces* ㅎ with the syllable **하**
3. Press `ㄴ` — the IME *replaces* 하 with the completed syllable **한**

During steps 1-3 the character is "composing" — it is not yet confirmed.
The OS draws this preview **at the terminal's real cursor position**.

### Why fake cursors break IME

Many terminal UI libraries render a cursor character (e.g. `█`) inside
the React tree and hide the real terminal cursor. This breaks IME because:

- The OS has no idea where the fake cursor is drawn.
- The composition preview appears at the *real* (hidden) cursor, usually
  at position (0, 0) or the bottom-left of the terminal.
- Korean/Japanese/Chinese users see garbled input or nothing at all.

### Why `stringWidth` matters

CJK characters are **fullwidth** — each occupies 2 terminal columns:

| Text   | `.length` | `stringWidth()` | Terminal columns |
|--------|-----------|------------------|------------------|
| `abc`  | 3         | 3                | 3                |
| `한글` | 2         | 4                | 4                |
| `あ`   | 1         | 2                | 2                |

Using `.length` for cursor positioning causes the cursor to drift left
after every CJK character.

## How `useCursor` + `stringWidth` solve it

```tsx
const {setCursorPosition} = useCursor();

const column = stringWidth(prompt + textBeforeCursor);
setCursorPosition({x: column, y: inputLineRow});
```

`useCursor` places the **real** terminal cursor at `(x, y)`.
The OS IME then draws its composition preview at exactly the right spot.

## Running the example

```bash
npx tsx examples/cursor-ime/cursor-ime.tsx
```

Switch your OS keyboard to Korean (or Japanese/Chinese) and start typing.
