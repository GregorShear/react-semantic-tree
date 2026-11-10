/**
 * DOM attributes `Branch` writes and `useLeaf` reads. Shared so the two sides
 * cannot drift: the anchor marker and the path value are deliberately separate
 * attributes, because a branch that adds no path segment still has to be
 * findable — otherwise its metadata and event flags are unreachable.
 */

/** Always present on a branch wrapper, whatever its path. The `useLeaf` anchor. */
export const ANCHOR_ATTRIBUTE = "data-semantic-branch";

/**
 * Omitted when the merged path is empty, so the value is never `""`: a leaf then
 * falls back to its own label instead of logging `" > label"`.
 */
export const PATH_ATTRIBUTE = "data-semantic-path";

/** Merged branch-chain metadata, JSON-encoded. */
export const METADATA_ATTRIBUTE = "data-semantic-metadata";

/** Merged branch-chain event flags, JSON-encoded. */
export const EVENTS_ATTRIBUTE = "data-semantic-events";

/**
 * Set on a tracked element by `useLeaf` itself, so a bubbled event can be traced
 * back to the leaf it started in. Branch anchors are found by `closest()` from the
 * leaf _upwards_, so they cannot answer this; the direction is reversed.
 */
export const LEAF_ATTRIBUTE = "data-semantic-leaf";
