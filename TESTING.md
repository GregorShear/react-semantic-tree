# Testing

Behaviours that are verified by hand (mostly against a jsdom harness) and are
the coverage to write first, roughly in priority order.

**Events**

- One `click` log per click, carrying the leaf's current `metadata`.
- `metadata` changes between renders are reflected in the next event's log (the hook reads it at event time, via a ref).
- `metadata` precedence: branch metadata is merged first, then the leaf's own, then the library-generated `eventType`, `role`, and `tagName`.
- Function-valued metadata resolves at event time, is overridden by `eventType`/`role`/`tagName`, receives `undefined` for events with no event object, and a throwing resolver drops only its own key.
- `events` merges down the branch chain, and a leaf inherits the merged values; disabling `click` on a branch means no click log at all.
- Per-leaf `events` overrides win in both directions: a leaf can enable an event its branch disabled (`{ hover: true }` under `events: { hover: false }`) and disable one its branch enabled (`{ click: false }`).
- A fresh overrides object on each render does not re-attach listeners (the flags are compared by value before `events` identity changes).

**Paths**

- Path resolves from the nearest `Branch` anchor in the DOM, including a branch declared in the same component's JSX as the leaf (the case React context cannot see).
- A leaf nested inside another leaf logs only the enclosing _branch_ path; leaves do not contribute path segments.
- A branch without a `label` publishes the inherited path unchanged (portals), and publishes no `data-semantic-path` attribute at all when it inherited nothing, so `closest()` skips it instead of stopping on an empty value.

**Lifecycle**

- `mount` logs once per element, `unmount` once.
- `hover` logs on `mouseenter` and `focus` on `focus`, each independently of a click that follows; re-entering the element logs `hover` again.
- `visible` / `scrolledAway` fire once per transition.
