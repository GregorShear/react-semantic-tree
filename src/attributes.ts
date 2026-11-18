/**
 * DOM attributes `Branch` writes and `useLeaf` reads.
 */

export const ANCHOR_ATTRIBUTE = "data-semantic-branch";
export const PATH_ATTRIBUTE = "data-semantic-path";
export const METADATA_ATTRIBUTE = "data-semantic-metadata";
export const EVENTS_ATTRIBUTE = "data-semantic-events";

/**
 * Nested leaves are non-standard, but technically supported.
 * This attribute helps identify the originating leaf when processing bubbled events.
 */
export const LEAF_ATTRIBUTE = "data-semantic-leaf";
