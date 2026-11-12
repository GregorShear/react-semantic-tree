import React, { createContext, useContext, useMemo } from "react";
import {
  ANCHOR_ATTRIBUTE,
  EVENTS_ATTRIBUTE,
  METADATA_ATTRIBUTE,
  PATH_ATTRIBUTE,
} from "./attributes";
import {
  type TrackingOptions,
  useConfigurationContext,
} from "./SemanticConfig";

interface SemanticContextValue {
  path: string;
  metadata: Record<string, any>;
  events: Required<TrackingOptions>;
}

export interface BranchProps {
  /**
   * Omit to add no path segment: the inherited path is re-materialised on a DOM
   * node instead, which is what portals need.
   */
  label?: string;
  metadata?: Record<string, any>;
  events?: TrackingOptions;
  children: React.ReactNode;
}

const EMPTY_METADATA: Record<string, any> = {};

const SemanticContext = createContext<SemanticContextValue | undefined>(
  undefined,
);

export const Branch: React.FC<BranchProps> = ({
  label,
  metadata,
  events,
  children,
}) => {
  const { events: globalEvents } = useConfigurationContext();
  const parentContext = useContext(SemanticContext);

  const {
    path: parentPath = "",
    metadata: parentMetadata = EMPTY_METADATA,
    events: parentEvents = globalEvents,
  } = parentContext ?? {};

  const value = useMemo(() => {
    // Without a label this is a pass-through: no segment is added.
    const currentPath = label
      ? parentPath
        ? `${parentPath} > ${label}`
        : label
      : parentPath;
    const currentMetadata = { ...parentMetadata, ...metadata };
    const currentEvents: Required<TrackingOptions> = {
      ...parentEvents,
      ...events,
    };
    return {
      path: currentPath,
      metadata: currentMetadata,
      events: currentEvents,
    };
  }, [parentPath, parentMetadata, parentEvents, label, metadata, events]);

  return (
    <SemanticContext.Provider value={value}>
      {/*
        DOM anchor for useLeaf: .closest() can see providers that context cannot,
        e.g. one declared in the same component's JSX. The anchor is a marker of
        its own rather than the path attribute, so a branch that adds no segment
        is still reachable — its metadata and flags matter even when the path is
        empty. The path attribute is omitted when empty, which keeps the leaf's
        resolved path from starting with a separator.
      */}
      <div
        style={{ display: "contents" }}
        {...{
          [ANCHOR_ATTRIBUTE]: "",
          [PATH_ATTRIBUTE]: value.path || undefined,
          [METADATA_ATTRIBUTE]: JSON.stringify(value.metadata),
          [EVENTS_ATTRIBUTE]: JSON.stringify(value.events),
        }}
      >
        {children}
      </div>
    </SemanticContext.Provider>
  );
};

export const useSemanticContext = () => {
  const context = useContext(SemanticContext);
  return context;
};
