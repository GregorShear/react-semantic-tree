# react-semantic-tree

[![npm version](https://badge.fury.io/js/react-semantic-tree.svg)](https://badge.fury.io/js/react-semantic-tree)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

Zero-dependency React library that turns your component tree into a semantic path for event logging and AI context.

```bash
npm install react-semantic-tree
```

## Usage

**1. Provider** — the adapter receives every event:

```tsx
const adapter: LoggerAdapter = (path, metadata) =>
  Sentry.addBreadcrumb({
    category: "user-action",
    message: path,
    data: metadata,
  });

<SemanticConfig adapter={adapter}>
  <Branch label="AppRoot" metadata={{ appVersion: "1.0.0" }}>
    <App />
  </Branch>
</SemanticConfig>;
```

Without an adapter it logs to `console.debug`.

**2. Branches** — each `label` appends a path segment, and `metadata` / `events` merge down the tree:

```tsx
<Branch label="UserSettings" metadata={{ user: user.email }}>
  <ProfileForm />
</Branch>
```

**3. Leaves** — attach the returned `ref`; the hook logs the interactions:

```tsx
const { ref } = useLeaf<HTMLButtonElement>("save_button");
return (
  <button ref={ref} onClick={save}>
    Save
  </button>
);
```

**4. Portals** — context crosses a portal but the DOM does not, so a branch without a `label` adds no segment and only re-materialises the inherited path inside the portal:

```tsx
<Dialog open={open}>
  <Branch>{/* leaves here resolve as "User Grants > …" */}</Branch>
</Dialog>
```

It has to sit inside the portalled component, not wrap the component that creates the portal.

**5. `withBranch`** — the same branch without touching call sites:

```tsx
export default withBranch("Team Settings", {
  metadata: { hello: "world" },
})(TeamSettings);
```

Returns a `forwardRef` component taking the wrapped component's props. Static properties are not copied, and parents that introspect `children` (tabs, selects) see the wrapper rather than the original element.

## What gets logged

Each event carries the resolved path and the merged metadata: branch metadata first, then the leaf's, then the library-generated `eventType`, `role`, and `tagName`.

Metadata is read at event time, not render time, so state and derived values are current:

```tsx
useLeaf("Create Invite Link", { prefix });
```

A value may be a function, called with the triggering event — for data that only exists once the user interacts:

```tsx
useLeaf("Choose Data Plane", {
  dataPlane: (event) => (event.target as HTMLInputElement).value,
});
```

Resolvers must be synchronous, and one that throws drops its own key. Only leaf metadata supports them: branch metadata is serialised onto the DOM anchor.

Element-specific data belongs in metadata. A resolver receives the event, and `currentTarget` is the tracked element:

```tsx
useLeaf("docs link", {
  href: (event) =>
    (event?.currentTarget as Element).closest("a[href]")?.getAttribute("href"),
});
```

`mount`, `unmount`, `visible`, and `scrolledAway` pass no event, so a resolver cannot read the element there — supply `metadata` instead.

| Event          | Logged when                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `mount`        | the element attaches.                                                   |
| `unmount`      | the element detaches.                                                   |
| `visible`      | it first intersects the viewport (IntersectionObserver, 10% threshold). |
| `hover`        | the pointer enters it (`mouseenter`).                                   |
| `focus`        | the element receives focus.                                             |
| `click`        | a click reaches the element.                                            |
| `scrolledAway` | it stops intersecting after having been visible.                        |

`click` is on by default; every other event is off unless you enable it.

## API

### `<SemanticConfig>`

| Prop       | Type                                    | Description                                                  |
| ---------- | --------------------------------------- | ------------------------------------------------------------ |
| `adapter`  | `(path: string, data?: object) => void` | Optional. Logging function; defaults to `consoleLogAdapter`. |
| `events`   | `TrackingOptions`                       | Optional. Which events to track, for the whole app.          |
| `children` | `React.ReactNode`                       | The application.                                             |

### `<Branch>`

| Prop       | Type                  | Description                                                                                                          |
| ---------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`              | Optional. Adds a path segment; omit it to only re-materialise the inherited path on a DOM node (useful for portals). |
| `metadata` | `Record<string, any>` | Optional. Merged with parent metadata.                                                                               |
| `events`   | `TrackingOptions`     | Optional. Event overrides for this subtree; a leaf's own `events` wins.                                              |
| `children` | `React.ReactNode`     | The part of the tree this branch applies to.                                                                         |

### `useLeaf(label, metadata?, events?)`

```ts
const { ref, element } = useLeaf<T>(label, metadata?, events?);
```

- `label` (**required**) — the leaf's path segment.
- `metadata` — merged last; values may be functions resolved at event time.
- `events` — per-leaf overrides, winning over branch and global config. Compared by value, so a fresh object each render is fine.
- `ref` — callback ref to attach to the element.
- `element` — the tracked node, or `null` when unmounted. Roughly `ref.current` of a ref object, which this ref is not.

### Types

`LoggerAdapter`, `TrackingOptions`, `BranchProps`.

## License

MIT — see [LICENSE](LICENSE).
