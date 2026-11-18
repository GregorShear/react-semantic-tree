# react-semantic-tree

[![npm version](https://badge.fury.io/js/react-semantic-tree.svg)](https://badge.fury.io/js/react-semantic-tree)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

Zero-dependency React library that turns your component tree into a semantic path for event logging.

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

Tracking is best-effort: an adapter that throws (or returns a rejecting promise) cannot affect the application. The failure is contained to that event, dropped rather than retried, and reported to the console in development. In production it is swallowed silently.

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

**4. Portals** — a leaf resolves its context from the DOM, not from React: it walks up to the nearest `data-semantic-branch` ancestor. A portal moves the DOM node but not the React one, so a leaf rendered through a portal has no branch to read, and only reports itself. Render a `<Branch>` inside the portal to re-materialise the inherited path, metadata and flags on a DOM node the leaf can find. Unlabeled and empty is the minimal form: it adds no path segment, only the inherited context.

```tsx
<Dialog open={open}>
  {/* the dialog renders its children through a portal */}
  <Branch>{/* leaves here resolve as "User Grants > …" */}</Branch>
</Dialog>
```

It has to sit inside the portalled content, not wrap the component that creates the portal: a `<Branch>` around `<Dialog>` publishes its anchor outside the portal, where the leaf cannot find it.

**5. `withBranch`** — the same branch without touching call sites:

```tsx
export default withBranch("Team Settings", {
  metadata: { hello: "world" },
})(TeamSettings);
```

Returns a `forwardRef` component taking the wrapped component's props. Static properties are not copied, and parents that introspect `children` (tabs, selects) see the wrapper rather than the original element.

## What gets logged

A leaf resolves everything from the DOM: the nearest `data-semantic-branch` ancestor supplies the path prefix, the metadata and the event flags. Leaves never read React context, so context has to be materialised on a DOM node — including inside a portal, which moves the node but not the React tree (see **Portals** under [Usage](#usage)).

Each event carries the resolved path and the merged metadata: branch metadata first, then the leaf's, then the library-generated `eventType` and `tagName`.

Metadata is read at event time, not render time, so state and derived values are current:

```tsx
useLeaf("Create Invite Link", { prefix });
```

It is always plain data: values are never called. Reading a `useLeaf` call tells you exactly what it captures, and nothing it captures was computed somewhere else or read off the DOM at event time. Anything that needs deriving is computed at the call site:

```tsx
useLeaf("docs link", { href: link.href, surface: "docs" });
```

| Event     | Logged when                                                             |
| --------- | ----------------------------------------------------------------------- |
| `mount`   | the element attaches.                                                   |
| `visible` | it enters the viewport (IntersectionObserver, 10% threshold).           |
| `hover`   | the pointer enters it (`mouseenter`).                                   |
| `focus`   | the element receives focus.                                             |
| `click`   | a click reaches the element.                                            |

`click` is on by default; every other event is off unless you enable it.

## API

### `<SemanticConfig>`

| Prop       | Type              | Description                                                                                                       |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `adapter`  | `LoggerAdapter`   | Optional. Receives one event; see [the payload contract](#the-payload-contract). Defaults to `consoleLogAdapter`. |
| `events`   | `TrackingOptions` | Optional. Which events to track, for the whole app.                                                               |
| `children` | `React.ReactNode` | The application.                                                                                                  |

### `<Branch>`

| Prop       | Type              | Description                                                                                                                               |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`          | Optional. Adds a path segment; omit it to only re-materialise the inherited path, metadata and events on a DOM node (useful for portals). |
| `metadata` | `JsonObject`      | Optional. Merged with parent metadata.                                                                                                    |
| `events`   | `TrackingOptions` | Optional. Event overrides for this subtree; a leaf's own `events` wins.                                                                   |
| `children` | `React.ReactNode` | The part of the tree this branch applies to.                                                                                              |

### `useLeaf(label, metadata?, events?)`

```ts
const { ref, element } = useLeaf<T>(label, metadata?, events?);
```

- `label` (**required**) — the leaf's path segment.
- `metadata` — merged last; plain data (`JsonObject`), read at event time.
- `events` — per-leaf overrides, winning over branch and global config. Compared by value, so a fresh object each render is fine.
- `ref` — callback ref to attach to the element.
- `element` — the tracked node, or `null` when unmounted. Roughly `ref.current` of a ref object, which this ref is not.

### Types

`LoggerAdapter`, `TrackingOptions`, `BranchProps`, `JsonObject`, `JsonValue`.

## License

MIT — see [LICENSE](LICENSE).
