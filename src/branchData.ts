import type { TrackingOptions } from "./SemanticConfig";
import type { JsonObject } from "./metadata";

/** The context a `<Branch>` publishes for the leaves beneath its anchor. */
export interface BranchData {
  path: string;
  metadata: JsonObject;
  events: Required<TrackingOptions>;
}

/**
 * Branch context is kept in memory, keyed by the anchor element a leaf finds
 * with `closest()`. A `WeakMap` ties each entry to its element's lifetime, so
 * unmounted branches are collected rather than leaked.
 */
const branchData = new WeakMap<Element, BranchData>();

export const setBranchData = (element: Element, data: BranchData) => {
  branchData.set(element, data);
};

export const getBranchData = (element: Element | null) =>
  element ? branchData.get(element) : undefined;
