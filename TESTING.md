# Testing

```bash
npm test          # vitest run, jsdom environment
npm run test:watch
```

Tests live in `src/__tests__/`, next to the code they cover, so they are
included in the library's `tsconfig`. `vitest.config.mts` points at
`src/__tests__/setup.ts`, which registers Testing Library cleanup and a
`IntersectionObserver` stub (jsdom has neither).

Behaviours that are verified by hand (mostly against a jsdom harness) and are
the coverage to write first, roughly in priority order.

**Events**

- One `click` log per click, carrying the leaf's current `metadata`.
- `metadata` changes between renders are reflected in the next event's log (the hook reads it at event time, via a ref).
- `metadata` precedence: branch metadata is merged first, then the leaf's own, then the library-generated `eventType` and `tagName`.
- Metadata is plain data: a function passed as a value reaches the adapter as a function and is never called.
- `events` merges down the branch chain, and a leaf inherits the merged values; disabling `click` on a branch means no click log at all.
- Per-leaf `events` overrides win in both directions: a leaf can enable an event its branch disabled (`{ hover: true }` under `events: { hover: false }`) and disable one its branch enabled (`{ click: false }`).
- A branch's flags outrank the ambient config in both directions: it can enable an event the global config disabled and veto one it enabled (`src/__tests__/unlabeledBranch.test.tsx`).
- A fresh overrides object on each render does not re-attach listeners (the flags are compared by value before `events` identity changes).

**Paths**

- Path resolves from the nearest `Branch` anchor in the DOM, including a branch declared in the same component's JSX as the leaf (the case React context cannot see). React context is never read, so every test that asserts inheritance also proves the anchor alone carries it.
- A leaf nested inside another leaf logs only the enclosing _branch_ path; leaves do not contribute path segments.
- A click in a nested leaf logs once, against the leaf it happened in, and not again against the enclosing leaf it bubbled to. A click on a plain descendant of a leaf is still the leaf's own (`src/__tests__/nestedLeaves.test.tsx`).
- A branch without a `label` keeps the inherited path unchanged (portals), and contributes no segment at all when it inherited nothing, so a leaf's resolved path is its own label rather than `" > label"`.
- A `<Branch>` rendered inside a portal re-registers the inherited path, metadata and flags on a DOM node the portalled leaf can find; unlabeled and empty is the minimal form (`src/__tests__/portals.test.tsx`).
- The attribute a leaf finds its branch by is a separate marker (`data-semantic-branch`), never the path, and the branch data itself is held in an in-memory `WeakMap` keyed by that element. A branch that adds metadata and flags but no segment is therefore still reachable, at the root and nested, including when `useLeaf` and the `Branch` share a component (`src/__tests__/unlabeledBranch.test.tsx`).

**Lifecycle**

- `mount` logs once per element.
- `hover` logs on `mouseenter` and `focus` on `focus`, each independently of a click that follows; re-entering the element logs `hover` again.
- `visible` fires once per entry into the viewport.
