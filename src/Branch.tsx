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
import { isDevelopment } from "./environment";
import { mergeMetadata, resolveEvents } from "./merge";
import { type JsonObject, sanitize } from "./metadata";

interface SemanticContextValue {
  path: string;
  metadata: JsonObject;
  events: Required<TrackingOptions>;
}

export interface BranchProps {
  label?: string;
  metadata?: JsonObject;
  events?: TrackingOptions;
  children: React.ReactNode;
}

const EMPTY_METADATA: JsonObject = {};

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

  const { value, attributes } = useMemo(() => {
    const currentPath = label
      ? parentPath
        ? `${parentPath} > ${label}`
        : label
      : parentPath;
    const { safe: currentMetadata, stripped } = sanitize(
      mergeMetadata(parentMetadata, metadata),
    );
    if (stripped?.length && isDevelopment()) {
      console.warn(
        `[react-semantic-tree] dropped non-JSON metadata at ` +
          `${currentPath || "(unlabeled branch)"}: ${stripped.join(", ")}`,
      );
    }
    const currentEvents = resolveEvents(parentEvents, events);

    return {
      value: {
        path: currentPath,
        metadata: currentMetadata,
        events: currentEvents,
      },
      attributes: {
        [ANCHOR_ATTRIBUTE]: "",
        [PATH_ATTRIBUTE]: currentPath || undefined,
        [METADATA_ATTRIBUTE]: JSON.stringify(currentMetadata),
        [EVENTS_ATTRIBUTE]: JSON.stringify(currentEvents),
      },
    };
  }, [parentPath, parentMetadata, parentEvents, label, metadata, events]);

  return (
    <SemanticContext.Provider value={value}>
      <span style={{ display: "contents" }} {...attributes}>
        {children}
      </span>
    </SemanticContext.Provider>
  );
};

type Options = Omit<BranchProps, "label" | "children">;

/** The wrapped component's props, plus a `ref` it may forward to the DOM. */
type Component<P extends object> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<any>
>;

export function withBranch(label: string, options: Options = {}) {
  const { metadata, events } = options;

  return function wrap<P extends object>(
    Component: React.ComponentType<P>,
  ): Component<P> {
    const WithBranch = React.forwardRef<any, P>(
      function WithBranchForwardRef(props, ref) {
        // `any` alias so JSX accepts `ref`, which a generic `P` has no prop for.
        const Inner: React.ComponentType<any> = Component;

        return (
          <Branch label={label} metadata={metadata} events={events}>
            <Inner {...props} ref={ref} />
          </Branch>
        );
      },
    );

    const componentName =
      // `name` is set on function components at runtime but absent from the type.
      Component.displayName ||
      (Component as { name?: string }).name ||
      "Component";

    WithBranch.displayName = `withBranch(${label})(${componentName})`;

    return WithBranch;
  };
}
