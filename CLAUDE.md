# Ink Codebase Guide

**Project Name:** Ink  
**Version:** 6.4.0  
**Type:** React renderer/library for CLI applications  
**Language:** TypeScript (with some JavaScript utility files)  
**Total Lines of Code:** ~4,600 (src)  
**Last Commit:** 6.4.0 (recent updates include onRender hook addition)

---

## Quick Summary

Ink is a React-compatible UI framework for building interactive command-line interfaces. It provides React developers with familiar component-based and hooks-based APIs to create rich terminal UIs with support for flexbox layouts, styling, focus management, and accessibility.

The project is used by major tools including Claude Code, Gemini CLI, GitHub Copilot for CLI, Wrangler, Gatsby, Prisma, and many others (125+ documented users).

---

## Project Structure

```
/Users/anshul/temp/ink/
├── src/                          # Main source code (~4,600 lines)
│   ├── components/               # 15 React component files
│   │   ├── Box.tsx              # Flex container component
│   │   ├── Text.tsx             # Text rendering component
│   │   ├── App.tsx              # Root app wrapper component
│   │   ├── Static.tsx           # Permanent/static output component
│   │   ├── Transform.tsx        # String transformation component
│   │   ├── Newline.tsx          # Newline insertion component
│   │   ├── Spacer.tsx           # Flexible space component
│   │   ├── ErrorOverview.tsx    # Error display component
│   │   └── *Context.ts          # React context files (6 total)
│   │       ├── AppContext.ts
│   │       ├── StdinContext.ts
│   │       ├── StdoutContext.ts
│   │       ├── StderrContext.ts
│   │       ├── FocusContext.ts
│   │       ├── BackgroundContext.ts
│   │       └── AccessibilityContext.ts
│   ├── hooks/                    # 8 React hooks
│   │   ├── use-input.ts
│   │   ├── use-app.ts
│   │   ├── use-stdin.ts
│   │   ├── use-stdout.ts
│   │   ├── use-stderr.ts
│   │   ├── use-focus.ts
│   │   ├── use-focus-manager.ts
│   │   └── use-is-screen-reader-enabled.ts
│   ├── Core rendering files
│   │   ├── index.ts             # Main export file (27 exports)
│   │   ├── render.ts            # render() API entry point
│   │   ├── ink.tsx              # Main Ink class (React reconciler wrapper)
│   │   ├── reconciler.ts        # React reconciler implementation
│   │   ├── renderer.ts          # Terminal renderer
│   │   ├── dom.ts               # Virtual DOM implementation
│   │   └── instances.ts         # Instance management
│   ├── Layout & styling
│   │   ├── styles.ts            # Style computation (~450 lines)
│   │   ├── output.ts            # Output buffer management
│   │   ├── render-node-to-output.ts
│   │   ├── render-border.ts
│   │   ├── render-background.ts
│   │   └── get-max-width.ts
│   ├── Utilities
│   │   ├── colorize.ts          # Color application
│   │   ├── log-update.ts        # Terminal update logic
│   │   ├── measure-element.ts   # Element measurement API
│   │   ├── measure-text.ts      # Text width calculation
│   │   ├── parse-keypress.ts    # Keyboard input parsing
│   │   ├── wrap-text.ts         # Text wrapping
│   │   ├── squash-text-nodes.ts # React children optimization
│   │   └── devtools.ts          # React DevTools integration
│
├── test/                         # Test suite (31 test files)
│   ├── fixtures/               # Test fixtures (23 folders)
│   ├── helpers/                # Test utilities
│   ├── *.tsx                   # Individual test files covering:
│   │   ├── components.tsx
│   │   ├── hooks.tsx
│   │   ├── render.tsx
│   │   ├── focus.tsx
│   │   ├── borders.tsx
│   │   ├── background.tsx
│   │   ├── flex-*.tsx (6 flex layout tests)
│   │   └── 20+ more specialized tests
│
├── examples/                     # 19 runnable examples
│   ├── counter/                # Simple state management
│   ├── use-input/              # User input handling
│   ├── use-focus/              # Focus management
│   ├── borders/                # Border styling
│   ├── box-backgrounds/        # Background colors
│   ├── static/                 # Static output component
│   ├── suspense/               # React Suspense support
│   ├── table/                  # Table rendering
│   ├── jest/                   # Jest-like UI
│   ├── chat/                   # Chat application
│   ├── select-input/           # Select/dropdown
│   ├── use-stdout/             # Direct stdout writing
│   ├── use-stderr/             # Direct stderr writing
│   ├── subprocess-output/      # Child process handling
│   ├── aria/                   # Accessibility example
│   ├── justify-content/        # Flexbox alignment
│   ├── render-throttle/        # Performance throttling
│   └── More examples...
│
├── benchmark/                   # Performance benchmarking
│   ├── simple/
│   └── static/
│
├── media/                       # Logo and demo files
├── .github/workflows/
│   └── test.yml               # CI/CD pipeline (GitHub Actions)
├── package.json               # NPM configuration & scripts
├── tsconfig.json              # TypeScript configuration
├── .editorconfig              # Editor settings
├── .npmrc                      # NPM config
└── readme.md                   # Main documentation (2,346 lines)
```

---

## Architecture Overview

### Core Design Patterns

Ink follows a **React reconciler pattern**. Here's how it works:

1. **React Reconciliation Layer** (`reconciler.ts`)
   - Implements `react-reconciler` interface
   - Converts React virtual tree into Ink's virtual DOM (custom implementation)
   - Handles mounting, updating, and unmounting of components

2. **Virtual DOM** (`dom.ts`)
   - Custom DOM-like structure for terminal nodes
   - Each node has: type, props, layout info, render callbacks
   - Uses Facebook's Yoga layout engine for flexbox calculations

3. **Terminal Rendering** (`renderer.ts`, `output.ts`)
   - Renders virtual DOM to ANSI escape sequence strings
   - Manages screen updates via `log-update` for smooth re-renders
   - Handles color application, borders, backgrounds

4. **Instance Management** (`ink.tsx`, `instances.ts`)
   - Single `Ink` class manages the full rendering lifecycle
   - Maintains multiple independent instances (one per stdout stream)
   - Handles throttling, Ctrl+C handling, console patching

### Key Technologies Used

- **react-reconciler** (v0.32.0) - React virtual tree to DOM conversion
- **yoga-layout** (v3.2.1) - Facebook's flexbox layout engine for terminal
- **chalk** (v5.6.0) - Terminal color styling
- **ansi-escapes** (v7.0.0) - ANSI escape code generation
- **cli-boxes** (v3.0.0) - Terminal border styles
- **ws** (v8.18.0) - WebSocket for React DevTools integration
- **signal-exit** (v3.0.7) - Graceful shutdown handling

### Data Flow

```
User JSX
    ↓
React reconciler
    ↓
Ink virtual DOM (dom.ts)
    ↓
Layout calculation (Yoga)
    ↓
Render nodes to output (render-*.ts)
    ↓
Apply colors & styles (colorize.ts, styles.ts)
    ↓
Terminal update (log-update.ts)
    ↓
ANSI sequences → stdout
```

---

## Key Components

### Core Components (src/components/)

| Component | Purpose | Props | Notes |
|-----------|---------|-------|-------|
| **Box** | Flex container | flexDirection, padding, margin, width, height, etc. | Every element is a flex container |
| **Text** | Text rendering | color, bold, italic, wrap, children | Only component that renders actual text |
| **App** | Root wrapper | Wraps entire component tree | Handles lifecycle, input, rendering |
| **Static** | Permanent output | items, children | Renders output once, doesn't update |
| **Transform** | String transform | transform function, children | Allows custom output transformations |
| **Newline** | Line breaks | count | Must be used inside Text |
| **Spacer** | Flexible space | (none) | Fills available space in flex container |

### React Hooks

| Hook | Purpose | Returns | Example Use |
|------|---------|---------|-------------|
| **useInput** | Listen to keypress | (none) | Building interactive CLIs |
| **useApp** | App lifecycle | {exit()} | Programmatic exit |
| **useStdin** | Access stdin stream | {stdin, setRawMode, isRawModeSupported} | Raw input handling |
| **useStdout** | Write to stdout | {stdout, write()} | Bypass Ink rendering |
| **useStderr** | Write to stderr | {stderr, write()} | Error output |
| **useFocus** | Component focus | {isFocused} | Tab navigation |
| **useFocusManager** | Focus control | {enableFocus, disableFocus, focusNext, focusPrevious, focus(id)} | Managing focus programmatically |
| **useIsScreenReaderEnabled** | Accessibility | boolean | Screen reader detection |

### Context Providers

Each context provides React Context for different data/functionality:
- **AppContext** - App instance and lifecycle
- **StdinContext** - Input stream access
- **StdoutContext** - Output stream access
- **StderrContext** - Error stream access
- **FocusContext** - Focus management state
- **BackgroundContext** - Background color context
- **AccessibilityContext** - Screen reader support

---

## Build System & Tooling

### Build Configuration

```bash
npm run build     # Compile TypeScript to ./build/
npm run dev       # Watch mode development
npm run test      # Run linting + type checking + tests
npm run example   # Run example files with ts-node/esm
npm run benchmark # Run benchmarks
```

**TypeScript Configuration** (`tsconfig.json`):
- Target: ES2023 with DOM, DOM.Iterable types
- Output directory: `./build`
- Source maps enabled
- JSX: react (transpiled by tsc)
- Isolated modules, experimentalResolver for ts-node

**Package.json Exports**:
```json
{
  "type": "module",  // ES modules
  "exports": {
    "types": "./build/index.d.ts",
    "default": "./build/index.js"
  },
  "engines": {
    "node": ">=20"  // Node 20+ only
  }
}
```

### Testing Setup

**Test Runner**: AVA  
**Test Files**: 31 files in `/test/**/*.tsx`  
**Configuration** (package.json):
```json
{
  "ava": {
    "workerThreads": false,
    "extensions": {"ts": "module", "tsx": "module"},
    "nodeArguments": ["--loader=ts-node/esm"]
  }
}
```

**Test Categories**:
- Component rendering tests
- Hook functionality tests
- Layout/flexbox tests
- Border styling tests
- Focus management tests
- Accessibility tests
- Performance tests

### Linting & Formatting

**Linter**: ESLint (xo wrapper)  
**Config** (package.json `xo` key):
- Extends: `xo-react`
- Prettier integration enabled
- Special rules for:
  - Camelcase with `unstable__` and `internal_` prefixes allowed
  - React-specific rules disabled in some cases
  - Complexity rules relaxed

**Prettier Config**: Uses `@vdemedes/prettier-config`

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/test.yml`):
- Runs on: push & pull requests
- Node.js 20 only
- Steps:
  1. Checkout code
  2. Setup Node.js
  3. npm install
  4. npm test -- --serial (all tests run serially)

---

## Development Workflow

### Key npm Scripts

```bash
npm run dev              # Watch TypeScript compilation
npm run build            # Build for distribution
npm run test             # Full test suite (TS check + lint + tests)
npm run example examples/counter   # Run a specific example
npm run benchmark benchmark/simple # Run performance benchmark
```

### Entry Points for Consumers

**Main export** (`src/index.ts`) provides:
- `render()` - Main API for mounting Ink apps
- Components: `Box`, `Text`, `Static`, `Transform`, `Newline`, `Spacer`
- Hooks: `useInput`, `useApp`, `useStdin`, `useStdout`, `useStderr`, `useFocus`, `useFocusManager`, `useIsScreenReaderEnabled`
- Utility: `measureElement()`
- Type: `DOMElement`, `RenderOptions`, `Instance`

### How to Add New Features

1. **New Component**: 
   - Create file in `src/components/*.tsx`
   - Implement as functional or class component
   - Export types and default component
   - Add to `src/index.ts`
   - Create tests in `test/components.tsx`

2. **New Hook**:
   - Create file in `src/hooks/use-*.ts`
   - Use React Hooks API
   - Export default hook function
   - Add to `src/index.ts`
   - Test in `test/hooks.tsx`

3. **New Styling Feature**:
   - Add property to `Styles` type in `src/styles.ts`
   - Implement computation logic in styles functions
   - Apply in `render-node-to-output.ts`

---

## Important Implementation Details

### Flexbox Layout (Yoga)

Ink uses **Facebook's Yoga** layout engine to calculate flexbox layouts in the terminal:
- Every `<Box>` is a flex container (like `display: flex` in CSS)
- Supports all standard flexbox properties
- Calculates actual pixel positions and dimensions
- Called via `onComputeLayout` callbacks when tree updates

### Input Handling

**Keyboard Input Processing** (`parse-keypress.ts`):
- Parses raw terminal sequences
- Detects arrow keys, Enter, Tab, Ctrl+C, etc.
- Returns structured `Key` object with flags
- Used by `useInput` hook

**Flow**:
1. Component calls `useInput(handler)` hook
2. Hook registers with stdin
3. Raw mode enabled
4. Keypresses parsed and handler called
5. Component can inspect `key.leftArrow`, `key.return`, etc.

### Console Patching

Ink patches `console.log`, `console.error`, etc. via `patch-console`:
1. Intercepts console output
2. Clears Ink's UI
3. Renders console message
4. Re-renders Ink UI
5. Prevents visual conflicts

Can be disabled with `patchConsole: false` option.

### Screen Reader Support

Accessibility features (`src/components/AccessibilityContext.ts`):
- ARIA roles supported: button, checkbox, radio, list, menu, progressbar, table, etc.
- ARIA states: checked, disabled, expanded, selected
- Labels and hidden elements
- Generates screen-reader-friendly output
- Enable via `INK_SCREEN_READER=true` env var

### Performance Optimization

1. **Render Throttling** (`ink.tsx`):
   - Default: 30 FPS (33ms throttle)
   - Configurable via `maxFps` option
   - Disabled in debug mode or with screen readers

2. **Dynamic Dispatch**:
   - `onRender` - Throttled render callback
   - `onImmediateRender` - Unthrottled render callback

3. **Static Component**:
   - `<Static>` renders output once
   - Only new items re-render
   - Used for logs, completed tasks

---

## Common Patterns & Best Practices

### Component Template

```typescript
import React, {FC} from 'react';
import {Box, Text} from 'ink';

type Props = {
  message: string;
};

const MyComponent: FC<Props> = ({message}) => (
  <Box flexDirection="column" padding={1}>
    <Text>{message}</Text>
  </Box>
);

export default MyComponent;
```

### Using Hooks

```typescript
import {useInput, useApp} from 'ink';

const MyApp = () => {
  const {exit} = useApp();
  
  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
  });
  
  return <Text>Press 'q' to quit</Text>;
};
```

### Testing Components

Uses `ink-testing-library`:
```typescript
import {render} from 'ink-testing-library';
import MyComponent from './my-component';

const {lastFrame} = render(<MyComponent message="Hello" />);
const output = lastFrame();
```

---

## File Roles Summary

### Core Rendering (Must Understand)
- `ink.tsx` - Main Ink class, orchestrates everything
- `reconciler.ts` - React reconciler implementation
- `renderer.ts` - Terminal output renderer
- `dom.ts` - Virtual DOM representation
- `styles.ts` - Style computation (~450 lines, complex)

### Layout & Styling
- `output.ts` - Output buffer, ANSI sequence generation
- `render-node-to-output.ts` - Node to terminal string conversion
- `render-border.ts` - Border rendering logic
- `render-background.ts` - Background color rendering
- `colorize.ts` - Text color application

### Components
- `components/Box.tsx` - Most used component
- `components/Text.tsx` - Text rendering
- `components/App.tsx` - Root app component (~300 lines)

### Utilities
- `parse-keypress.ts` - Keyboard input parsing (complex, ignored by linter)
- `log-update.ts` - Terminal update management
- `measure-element.ts` - Layout measurement API
- `devtools.ts` - React DevTools integration

---

## Important Notes for Contributors

1. **Node 20+ only** - Project uses modern JavaScript features
2. **TypeScript** - Everything is typed, strict mode encouraged
3. **React 19+** - Uses latest React with latest hooks
4. **ESM only** - `"type": "module"` in package.json
5. **Serial tests** - Tests run serially (no worker threads) due to terminal I/O
6. **Yoga layout** - Must understand flexbox for layout features
7. **ANSI sequences** - Terminal colors and positioning use ANSI codes
8. **No React DevTools in most CIs** - Optional dependency for debugging

---

## External Resources

- **Repository**: https://github.com/vadimdemedes/ink
- **npm Package**: https://npmjs.com/package/ink
- **React Documentation**: https://reactjs.org
- **Yoga Layout**: https://github.com/facebook/yoga
- **React Reconciler**: Internal React API docs
- **Chalk**: https://github.com/chalk/chalk (color library)
- **Testing Library**: https://github.com/vadimdemedes/ink-testing-library

---

## Known Limitations & Future Considerations

1. **Terminal-only** - Not for browser or server rendering
2. **Single instance per stdout** - Can't have multiple Ink apps writing to same stream
3. **Layout measurement** - `measureElement()` returns zeros until first render
4. **Raw mode** - Not all terminals support raw input mode
5. **Yoga limitations** - Some CSS flexbox features may not work identically

---

## Quick Reference: Common Development Tasks

### Run Tests
```bash
npm test
```

### Run Specific Test
```bash
npm test -- test/components.tsx
```

### Run Example
```bash
npm run example examples/counter
```

### Watch TypeScript
```bash
npm run dev
```

### Build for Distribution
```bash
npm run build
```

### Debug with React DevTools
```bash
DEV=true npm run example examples/counter
# In another terminal:
npx react-devtools
```

---

## File Statistics

- **Total Source Lines**: ~4,600
- **Total Test Files**: 31
- **Total Example Files**: 19
- **Components**: 7 core + 7 context providers
- **Hooks**: 8
- **Dependencies**: 17 production, 26 dev
- **Supported Node Versions**: 20+
- **TypeScript Strict Mode**: Yes
