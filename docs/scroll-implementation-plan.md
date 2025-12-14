# Overflow Scroll Implementation Plan

## Overview

Implement `overflow="scroll"` support for the Box component in Ink, enabling visual scrolling of TUI content including bordered boxes, text, and nested components.

## Design Rationale

### Why Ref-Based API Instead of Direct State Mutation?

**Previous approach (rejected)**:
```tsx
// ❌ Direct mutation - bypasses React reconciliation
useEffect(() => {
  boxRef.current.internal_scrollOffset = {x: 5, y: 10};
}, []);
```

**Problems**:
- Mutates DOM node directly, breaking React's declarative model
- No way to trigger re-render reliably
- Hard to test (requires mocking internal structure)
- Violates React best practices
- Difficult to compose with other components

**Current approach (ref-based API)**:
```tsx
// ✅ Imperative handle - proper React pattern
const boxRef = useRef<BoxRef>(null);

useEffect(() => {
  boxRef.current?.scrollTo({x: 5, y: 10});
}, []);
```

**Benefits**:
- Follows React's `useImperativeHandle` pattern (like video/audio elements)
- Box component controls when and how to update internal state
- Clear API surface via TypeScript types
- Easy to test with ref methods
- Can be used standalone or composed into higher-level components
- Consistent with other Ink patterns (e.g., `measureElement` returns ref-based API)

**Comparison to web APIs**:

Similar to DOM APIs like `scrollTo()` on elements:
```tsx
// HTML video element
videoRef.current?.play();
videoRef.current?.pause();

// HTML element scrolling
divRef.current?.scrollTo({top: 100, behavior: 'smooth'});

// Ink Box scrolling (similar pattern)
boxRef.current?.scrollTo({x: 0, y: 100});
```

This makes the API intuitive for developers familiar with web standards.

## Visual Scroll Behavior

In a TUI, "visual scroll" means the **entire rendered content** (including borders, boxes, text) shifts as a unit within a clipped viewport:

```
Container (5 rows visible, scrollTop=2)
┌──────────────────┐
│ ┌──────────┐     │  ← Row 0 of child box (clipped - above viewport)
│ │ Item 1   │     │  ← Row 1 of child box (clipped - above viewport)
├─┼──────────┼─────┤  ← Viewport starts here (y >= scrollTop)
│ │ Item 2   │     │  ← visible (original y=2, rendered at y=0)
│ │ Item 3   │     │  ← visible (original y=3, rendered at y=1)
│ └──────────┘     │  ← visible (border at y=4, rendered at y=2)
│ ┌──────────┐     │  ← visible (another box starts)
│ │ Item 4   │     │  ← visible
├─┴──────────┴─────┤  ← Viewport ends here
│ │ Item 5   │     │  ← clipped (below viewport)
│ └──────────┘     │  ← clipped
└──────────────────┘
```

## Implementation Steps

### Step 1: Update Styles Types (`src/styles.ts`)

Add `'scroll'` to overflow type definitions:

```typescript
readonly overflow?: 'visible' | 'hidden' | 'scroll';
readonly overflowX?: 'visible' | 'hidden' | 'scroll';
readonly overflowY?: 'visible' | 'hidden' | 'scroll';
```

### Step 2: Add Box Ref Type (`src/components/Box.tsx`)

Define imperative handle interface for Box component:

```typescript
export type BoxRef = {
  /**
   * Scroll the box content to a specific position.
   * Only works when overflow is set to 'scroll'.
   */
  scrollTo: (options: {x?: number; y?: number}) => void;

  /**
   * Get current scroll position.
   */
  getScrollPosition: () => {x: number; y: number};

  /**
   * Get the underlying DOM element.
   */
  element: DOMElement | null;
};
```

Update Box component to use `useImperativeHandle`:

```typescript
const Box = forwardRef<BoxRef, PropsWithChildren<Props>>(
  ({children, backgroundColor, ...props}, ref) => {
    const internalRef = useRef<DOMElement>(null);
    const scrollStateRef = useRef({x: 0, y: 0});

    useImperativeHandle(ref, () => ({
      scrollTo: ({x, y}) => {
        if (x !== undefined) scrollStateRef.current.x = x;
        if (y !== undefined) scrollStateRef.current.y = y;

        // Trigger re-render by marking element dirty
        if (internalRef.current?.yogaNode) {
          internalRef.current.yogaNode.markDirty();
        }
      },
      getScrollPosition: () => ({...scrollStateRef.current}),
      element: internalRef.current,
    }), []);

    // Store scroll state on DOM element for renderer to access
    useLayoutEffect(() => {
      if (internalRef.current) {
        internalRef.current.internal_scrollOffset = scrollStateRef.current;
      }
    });

    return (
      <ink-box ref={internalRef} style={{...style}} {...props}>
        {children}
      </ink-box>
    );
  }
);
```

### Step 3: Update DOM Types (`src/dom.ts`)

Add scroll offset storage to DOMElement (renderer reads this):

```typescript
export type DOMElement = {
  // ... existing fields
  internal_scrollOffset?: {x: number; y: number};
} & InkNode;
```

**Note**: This property is set by Box component and read by renderer. It's not directly mutated by user code.

### Step 4: Update Rendering (`src/render-node-to-output.ts`)

Modify child rendering to apply scroll offset. The key is applying scroll offset AFTER border rendering but BEFORE child rendering:

```typescript
if (node.nodeName === 'ink-box') {
  // 1. Render background and borders FIRST (these don't scroll)
  renderBackground(x, y, node, output);
  renderBorder(x, y, node, output);

  // 2. Set up clipping for overflow:hidden or overflow:scroll
  const clipHorizontally =
    node.style.overflowX === 'hidden' || node.style.overflowX === 'scroll' ||
    node.style.overflow === 'hidden' || node.style.overflow === 'scroll';
  const clipVertically =
    node.style.overflowY === 'hidden' || node.style.overflowY === 'scroll' ||
    node.style.overflow === 'hidden' || node.style.overflow === 'scroll';

  if (clipHorizontally || clipVertically) {
    // Calculate clip bounds INSIDE borders
    const x1 = clipHorizontally
      ? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
      : undefined;

    const x2 = clipHorizontally
      ? x +
        yogaNode.getComputedWidth() -
        yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
      : undefined;

    const y1 = clipVertically
      ? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
      : undefined;

    const y2 = clipVertically
      ? y +
        yogaNode.getComputedHeight() -
        yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
      : undefined;

    output.clip({x1, x2, y1, y2});
    clipped = true;
  }
}

// 3. Render children with scroll offset applied
if (node.nodeName === 'ink-root' || node.nodeName === 'ink-box') {
  // Get scroll offset (only present on scroll containers)
  const scrollOffset = node.internal_scrollOffset ?? {x: 0, y: 0};

  for (const childNode of node.childNodes) {
    renderNodeToOutput(childNode as DOMElement, output, {
      // Apply scroll offset by SUBTRACTING from parent position
      // This shifts content up/left when scrolling down/right
      offsetX: x - scrollOffset.x,
      offsetY: y - scrollOffset.y,
      transformers: newTransformers,
      skipStaticElements,
    });
  }

  if (clipped) {
    output.unclip();
  }
}
```

**Key changes from current code**:
1. Add `'scroll'` to overflow checks alongside `'hidden'`
2. Extract scroll offset from `node.internal_scrollOffset`
3. Subtract scroll offset when passing position to children
4. Everything else remains the same (borders, clipping bounds)

### Step 5: Update Exports (`src/index.ts`)

```typescript
// Add to existing exports
export type {BoxRef} from './components/Box.js';
```

**Note**: `useScroll` hook and `ScrollBox` component are intentionally NOT included in core Ink. Consumers can implement their own scroll management logic using the Box ref API. This keeps Ink's core minimal while providing the primitive needed for scroll implementations.

### Step 6: Create Example (`examples/scroll/`)

Demonstrate how consumers can implement scroll functionality using the Box ref API.

**Example implementation** (`examples/scroll/scroll.tsx`):

```tsx
import React, {useRef, useState, useCallback} from 'react';
import {render, Box, Text, useInput, type BoxRef} from '../../src/index.js';

const items = Array.from({length: 30}, (_, i) => `Item ${i + 1}`);

const ScrollExample = () => {
  const boxRef = useRef<BoxRef>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Define container and content dimensions
  const containerHeight = 10;
  const contentHeight = items.length;
  const maxScroll = Math.max(0, contentHeight - containerHeight);

  // Scroll control functions
  const scrollBy = useCallback((delta: number) => {
    setScrollTop(prev => {
      const next = Math.max(0, Math.min(maxScroll, prev + delta));
      boxRef.current?.scrollTo({x: 0, y: next});
      return next;
    });
  }, [maxScroll]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
    boxRef.current?.scrollTo({x: 0, y: 0});
  }, []);

  const scrollToBottom = useCallback(() => {
    setScrollTop(maxScroll);
    boxRef.current?.scrollTo({x: 0, y: maxScroll});
  }, [maxScroll]);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.downArrow) {
      scrollBy(1);
    } else if (key.upArrow) {
      scrollBy(-1);
    } else if (key.pageDown) {
      scrollBy(10);
    } else if (key.pageUp) {
      scrollBy(-10);
    } else if (input === 'g') {
      scrollToTop();
    } else if (input === 'G') {
      scrollToBottom();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>
        Scrollable List - Scroll: {scrollTop}/{maxScroll}
      </Text>
      <Text dimColor>Use arrow keys, PageUp/Down, g/G</Text>

      <Box marginTop={1}>
        <Box
          ref={boxRef}
          width={30}
          height={containerHeight}
          overflow="scroll"
          borderStyle="round"
        >
          <Box flexDirection="column">
            {items.map(item => (
              <Text key={item}>{item}</Text>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

render(<ScrollExample />);
```

**Key points**:
- Consumer manages scroll state with `useState`
- Uses Box ref API (`scrollTo`) to update scroll position
- Implements their own scroll limits and clamping logic
- Can add custom features (e.g., scroll indicators, momentum)
- No dependency on built-in scroll components

**Alternative: Reusable Hook Pattern** (consumers can create):

```tsx
// Custom hook consumers can implement
function useScrollBox(options: {
  containerHeight: number;
  contentHeight: number;
}) {
  const boxRef = useRef<BoxRef>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const maxScroll = Math.max(0, options.contentHeight - options.containerHeight);

  const scrollTo = useCallback((y: number) => {
    const clamped = Math.max(0, Math.min(maxScroll, y));
    setScrollTop(clamped);
    boxRef.current?.scrollTo({x: 0, y: clamped});
  }, [maxScroll]);

  const scrollBy = useCallback((delta: number) => {
    scrollTo(scrollTop + delta);
  }, [scrollTop, scrollTo]);

  return {
    boxRef,
    scrollTop,
    maxScroll,
    scrollTo,
    scrollBy,
    canScroll: maxScroll > 0,
  };
}

// Usage
const MyComponent = () => {
  const scroll = useScrollBox({
    containerHeight: 10,
    contentHeight: 30,
  });

  useInput((input, key) => {
    if (key.downArrow) scroll.scrollBy(1);
    if (key.upArrow) scroll.scrollBy(-1);
  });

  return (
    <Box ref={scroll.boxRef} height={10} overflow="scroll">
      {/* Content */}
    </Box>
  );
};
```

### Step 7: Add Tests (`test/scroll.tsx`)

Test cases for the core scroll functionality (Box ref API):

```tsx
import React, {useRef, useEffect} from 'react';
import test from 'ava';
import {Box, Text, type BoxRef} from '../src/index.js';
import {renderToString} from './helpers/render-to-string.js';

test('Box ref API - scrollTo updates scroll position', t => {
  const TestComponent = () => {
    const boxRef = useRef<BoxRef>(null);

    useEffect(() => {
      boxRef.current?.scrollTo({x: 0, y: 2});
    }, []);

    return (
      <Box ref={boxRef} width={10} height={3} overflow="scroll">
        <Box flexDirection="column">
          <Text>Line 1</Text>
          <Text>Line 2</Text>
          <Text>Line 3</Text>
          <Text>Line 4</Text>
          <Text>Line 5</Text>
        </Box>
      </Box>
    );
  };

  const output = renderToString(<TestComponent />);

  // Should show lines 3, 4, 5 (scrolled down by 2)
  t.true(output.includes('Line 3'));
  t.true(output.includes('Line 4'));
  t.true(output.includes('Line 5'));
  t.false(output.includes('Line 1'));
  t.false(output.includes('Line 2'));
});

test('Box ref API - getScrollPosition returns current position', t => {
  const TestComponent = () => {
    const boxRef = useRef<BoxRef>(null);

    useEffect(() => {
      boxRef.current?.scrollTo({x: 5, y: 10});
      const pos = boxRef.current?.getScrollPosition();

      t.is(pos?.x, 5);
      t.is(pos?.y, 10);
    }, []);

    return (
      <Box ref={boxRef} width={20} height={10} overflow="scroll">
        <Text>Content</Text>
      </Box>
    );
  };

  renderToString(<TestComponent />);
});

test('overflow scroll - vertical scroll with borders', t => {
  const TestComponent = () => {
    const boxRef = useRef<BoxRef>(null);

    useEffect(() => {
      boxRef.current?.scrollTo({x: 0, y: 2});
    }, []);

    return (
      <Box
        ref={boxRef}
        width={10}
        height={5}
        overflow="scroll"
        borderStyle="round"
      >
        <Box flexDirection="column">
          {Array.from({length: 10}, (_, i) => (
            <Text key={i}>Item {i}</Text>
          ))}
        </Box>
      </Box>
    );
  };

  const output = renderToString(<TestComponent />);

  // Border should be visible and not scrolled
  t.true(output.includes('╭'));
  t.true(output.includes('╰'));

  // Content should be scrolled (first 2 items hidden)
  t.false(output.includes('Item 0'));
  t.false(output.includes('Item 1'));
  t.true(output.includes('Item 2'));
});

test('overflow scroll - horizontal scroll clips content', t => {
  const TestComponent = () => {
    const boxRef = useRef<BoxRef>(null);

    useEffect(() => {
      boxRef.current?.scrollTo({x: 5, y: 0});
    }, []);

    return (
      <Box ref={boxRef} width={10} height={3} overflowX="scroll">
        <Text>This is a very long line that should be clipped</Text>
      </Box>
    );
  };

  const output = renderToString(<TestComponent />);

  // Only 10 characters should be visible (from position 5)
  t.is(output.split('\n')[0].length, 10);
});

test('ScrollBox - getScrollPosition returns current position', t => {
  const TestComponent = () => {
    const scrollRef = useRef<ScrollBoxRef>(null);

    useEffect(() => {
      scrollRef.current?.scroll.scrollTo(3, 5);
      const pos = scrollRef.current?.box?.getScrollPosition();

      // Would need a way to expose this for testing
      // Could use a context or callback
    }, []);

    return (
      <ScrollBox
        ref={scrollRef}
        width={10}
        height={5}
        contentWidth={20}
        contentHeight={15}
      >
        <Text>Content</Text>
      </ScrollBox>
    );
  };

  renderToString(<TestComponent />);
  t.pass();
});
```

**Additional test areas**:
- Scroll offset applies to all child types (Text, Box, nested structures)
- Nested scroll containers work independently
- Scroll state updates trigger re-render correctly
- Border rendering is unaffected by scroll offset
- maxScroll calculations account for borders

## Implementation Phases

### Phase 1: Core Scroll Primitive (Ink Core)

**Goal**: Provide low-level Box ref API for scroll control

**Scope**:
- Add `overflow="scroll"` style support
- Implement Box ref API (`scrollTo`, `getScrollPosition`)
- Update rendering to apply scroll offset from `internal_scrollOffset`
- Trigger re-render via `yogaNode.markDirty()`
- Create example showing consumer scroll implementation
- Full test coverage of Box ref API

**What's included in Ink core**:
- `overflow="scroll"` style type
- `BoxRef` interface with scroll methods
- Scroll offset rendering in `render-node-to-output.ts`
- Internal state storage in `internal_scrollOffset`

**What consumers implement**:
- Scroll state management (`useState` for scroll position)
- Scroll limits and clamping logic
- Scroll control methods (`scrollBy`, `scrollToTop`, etc.)
- Keyboard/mouse input handling
- Scroll indicators (if desired)

**Example usage**:
```tsx
const boxRef = useRef<BoxRef>(null);
const [scrollY, setScrollY] = useState(0);
const maxScroll = contentHeight - containerHeight;

useInput((input, key) => {
  if (key.downArrow) {
    const newY = Math.min(maxScroll, scrollY + 1);
    setScrollY(newY);
    boxRef.current?.scrollTo({x: 0, y: newY});
  }
});

<Box ref={boxRef} height={10} overflow="scroll">
  {/* Content */}
</Box>
```

### Phase 2: Community Ecosystem (External Packages)

**Goal**: Consumers build higher-level scroll abstractions

**Possible community packages**:
- **`ink-scroll`**: Full-featured ScrollBox component with useScroll hook
  - Automatic dimension tracking
  - Built-in scroll methods
  - Optional scroll indicators

- **`ink-virtual-list`**: Virtual scrolling for performance
  - Renders only visible items
  - Handles large datasets efficiently

- **`ink-smooth-scroll`**: Animated scrolling effects
  - Easing functions
  - requestAnimationFrame-based updates

- **`ink-scrollbar`**: Visual scroll indicators
  - ASCII/Unicode scrollbar rendering
  - Position indicators
  - Themeable styles

**Benefits of external approach**:
- ✅ Keeps Ink core minimal (single primitive vs. multiple components)
- ✅ Faster iteration on UX patterns without core API changes
- ✅ Consumers only install what they need
- ✅ Multiple competing implementations can coexist
- ✅ Community ownership and maintenance

### Phase 3: Future Considerations

**If a scroll pattern becomes universally adopted**, consider core integration:

**Criteria for inclusion**:
- Used in >80% of applications that need scrolling
- API is stable for >6 months
- Implementation adds <100 LOC to core
- No performance regressions
- Clear benefit over external packages

**Most likely candidate**: A basic `useScroll` hook if the pattern converges across community packages.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/styles.ts` | Modify | Add `'scroll'` to overflow types |
| `src/components/Box.tsx` | Modify | Add `BoxRef` type with `scrollTo()` and `getScrollPosition()` API using `useImperativeHandle` |
| `src/dom.ts` | Modify | Add `internal_scrollOffset` to DOMElement (read by renderer) |
| `src/render-node-to-output.ts` | Modify | Apply scroll offset during child rendering, add `'scroll'` to overflow checks |
| `src/index.ts` | Modify | Export `BoxRef` type |
| `examples/scroll/index.ts` | Create | Example entry point |
| `examples/scroll/scroll.tsx` | Create | Example showing consumer implementing scroll with Box ref API |
| `test/scroll.tsx` | Create | Unit tests for Box scroll functionality |

**Note**: `useScroll` hook and `ScrollBox` component are NOT included. Consumers implement their own scroll management using the Box ref API primitive.

## Technical Notes

### 1. Yoga Layout and Scroll Timing

Yoga calculates layout as if content is fully visible. Scroll offset is applied only during the rendering phase, not during layout calculation. This means:
- Layout positions are absolute and unaware of scrolling
- Scroll offset modifies render positions, not layout positions
- This separation ensures consistent layout regardless of scroll state

### 2. Clipping Mechanism

Reuse existing `Output.clip()` mechanism - scroll containers clip same as `overflow: hidden`. The clipping operation:
- Uses `x1, x2, y1, y2` bounds to define the viewport
- Applies `sliceAnsi` for horizontal clipping (preserves ANSI codes)
- Uses array slicing for vertical clipping
- Supports nested clipping contexts via a clip stack

### 3. Border and Scroll Offset Interaction

**Critical Detail**: Scroll offset application must respect the rendering order in `render-node-to-output.ts`:

```
1. renderBackground()      // Render container background
2. renderBorder()          // Render container border
3. [Apply clip if needed]  // Set up viewport bounds
4. Render children         // Apply scroll offset HERE
```

**Implementation specifics**:
- Borders are rendered at the parent container level BEFORE children
- Container borders remain static (do not scroll with content)
- Scroll offset is applied when calculating child positions: `offsetX: x - scrollOffset.x`
- The `x` and `y` in this calculation already include border width from Yoga layout
- Clipping bounds are calculated INSIDE borders using `getComputedBorder()`

**Example with borders**:
```
Container: width=10, borderStyle='round', scrollTop=2
├─ Border takes 1 column on each side
├─ Content area: 8 columns wide
├─ Viewport: rows 0-4 visible inside borders
├─ Child content offset by -2 (scrollTop)
│
Render order:
1. Draw border box at x=0, y=0
2. Set clip bounds: x1=1, x2=9, y1=1, y2=5 (inside borders)
3. Render children at: x=1-scrollLeft, y=1-scrollTop
4. Children outside clip bounds are not rendered
```

### 4. Content Measurement Strategy

**Challenge**: Yoga performs layout before rendering, but content dimensions may need to be calculated dynamically for scroll limits.

**Solution using `onComputeLayout` callback**:

```typescript
// In ScrollBox component
useEffect(() => {
  if (boxRef.current) {
    boxRef.current.onComputeLayout = () => {
      // Called after Yoga layout is complete
      const yogaNode = boxRef.current.yogaNode;
      if (yogaNode) {
        // Measure actual content dimensions
        const contentWidth = measureContentWidth(boxRef.current);
        const contentHeight = measureContentHeight(boxRef.current);

        // Update scroll limits
        setMaxScroll({
          x: Math.max(0, contentWidth - yogaNode.getComputedWidth()),
          y: Math.max(0, contentHeight - yogaNode.getComputedHeight()),
        });
      }
    };
  }
}, []);
```

**Content measurement approaches**:

1. **Explicit sizing** (Recommended for MVP):
   - User provides `contentWidth` and `contentHeight` props
   - Simple, predictable, no measurement overhead
   - Example: `<ScrollBox width={10} height={5} contentWidth={20} contentHeight={15}>`

2. **Auto-measurement from Yoga** (Phase 2):
   - Walk child nodes and sum their computed dimensions
   - Account for flex layout, gaps, margins
   - More complex but provides better DX

3. **Hybrid approach**:
   - Default to explicit sizing
   - Provide `measureContent={true}` prop for auto-measurement
   - Allows users to opt-in to measurement cost

**Implementation notes for measurement**:
- Must account for border width when calculating viewport size
- Content dimensions include all children and their spacing (gaps, margins)
- Re-measure when children change or layout is invalidated
- Use `yogaNode.getComputedWidth()` and `getComputedHeight()` for container size
- Subtract border widths to get actual viewport dimensions

### 5. Performance Considerations

Scroll offset changes trigger re-render. For smooth scrolling:
- Each scroll update causes full reconciliation and re-render
- Clipping is efficient (happens during output generation, not layout)
- Consider debouncing scroll updates if handling high-frequency input
- Initial implementation: no throttling (keep simple)
- Future optimization: batch scroll updates with `requestAnimationFrame` equivalent

### 6. Scroll State Management and Architecture

**Three-layer architecture**:

1. **Box Component (Low-level primitive)**:
   - Exposes `scrollTo()` and `getScrollPosition()` via ref
   - Maintains scroll state in a `useRef` (doesn't trigger re-render on its own)
   - Stores state in `internal_scrollOffset` for renderer access
   - Calls `yogaNode.markDirty()` to trigger re-render when scroll changes
   - Works with any `overflow="scroll"` box

2. **useScroll Hook (State management)**:
   - Manages scroll position with React state (`useState`)
   - Calculates scroll limits based on content/container dimensions
   - Provides imperative API: `scrollTo()`, `scrollBy()`, `scrollToTop()`, etc.
   - Clamps all scroll values to valid range [0, max]
   - Can be used independently or with ScrollBox component

3. **ScrollBox Component (High-level convenience)**:
   - Combines Box + useScroll for easier usage
   - Syncs useScroll state to Box via `scrollTo()` calls
   - Provides declarative API for common scroll scenarios
   - Handles dimension parsing and scroll direction auto-detection

**Data flow**:
```
User action (e.g., key press)
  ↓
scrollRef.current.scroll.scrollBy(0, 1)  // Call useScroll method
  ↓
useScroll updates state (scrollTop++)
  ↓
useEffect in ScrollBox detects change
  ↓
boxRef.current.scrollTo({y: newScrollTop})  // Call Box ref method
  ↓
Box updates scrollStateRef and internal_scrollOffset
  ↓
yogaNode.markDirty() triggers re-render
  ↓
Renderer reads internal_scrollOffset and applies offset
  ↓
Output shows scrolled content
```

**Key benefits of this approach**:
- ✅ Proper React patterns (no direct DOM mutation from user code)
- ✅ Layered abstraction (can use Box alone or with ScrollBox)
- ✅ Testable (ref methods can be called directly in tests)
- ✅ Flexible (can build custom scroll UIs with useScroll + Box ref)
- ✅ Type-safe (TypeScript enforces correct ref types)
