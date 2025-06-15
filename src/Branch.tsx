import React, { createContext, useContext, useMemo } from "react";
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
    metadata: parentMetadata = {},
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
        e.g. one declared in the same component's JSX. The path attribute is
        omitted when empty so .closest() skips instead of matching "".
      */}
      <div
        style={{ display: "contents" }}
        data-semantic-path={value.path || undefined}
        data-semantic-metadata={JSON.stringify(value.metadata)}
        data-semantic-events={JSON.stringify(value.events)}
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
