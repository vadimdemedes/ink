# Configurable Submit Behavior Example

Demonstrates the `submitKeyBehavior` option with two input submission modes.

## Submit Modes

### Enter Mode (default)
- **Enter** submits the message

### Ctrl+Enter Mode
- **Enter** adds a newline
- **Ctrl+Enter** submits the message

## Running

```bash
# Enter mode (default)
npm run example examples/configurable-submit/index.ts

# Ctrl+Enter mode
SUBMIT_MODE=ctrl-enter npm run example examples/configurable-submit/index.ts
```

## Note

Ctrl+Enter detection requires the [Kitty Keyboard Protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/). This example enables it via `kittyKeyboard: { mode: 'enabled' }`. Supported terminals include Kitty, Alacritty, WezTerm, and Ghostty.
