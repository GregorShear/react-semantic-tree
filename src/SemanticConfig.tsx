import React, { createContext, useContext, useMemo } from "react";
import { resolveEvents } from "./merge";
import type { JsonObject } from "./metadata";

export type LoggerAdapter = (
  semanticPath: string,
  metadata?: JsonObject,
) => void;

export interface TrackingOptions {
  mount?: boolean;
  hover?: boolean;
  click?: boolean;
  focus?: boolean;
  visible?: boolean;
}

/** `click` is the only event on by default. */
const DEFAULT_EVENTS: Required<TrackingOptions> = {
  mount: false,
  hover: false,
  click: true,
  focus: false,
  visible: false,
};

interface ConfigurationContextValue {
  adapter: LoggerAdapter;
  events: Required<TrackingOptions>;
}

interface SemanticConfigProps {
  adapter?: LoggerAdapter;
  /** Event tracking for the whole app; `click` is the only one on by default. */
  events?: TrackingOptions;
  children: React.ReactNode;
}

const ConfigurationContext = createContext<
  ConfigurationContextValue | undefined
>(undefined);

const colors: Record<string, string> = {
  mount: "#17a2b8", // Blue
  visible: "#28a745", // Green
  focus: "#6f42c1", // Purple
  hover: "#fd7e14", // Orange
  click: "#e83e8c", // Pink
};

/** Logs to `console.debug`; used when no `adapter` is given. */
export const consoleLogAdapter: LoggerAdapter = (semanticPath, metadata) => {
  const { eventType, ...payload } = metadata ?? {};
  const eventTypeName = typeof eventType === "string" ? eventType : "";
  const label = (eventTypeName || "unknown").toUpperCase();
  const color = colors[eventTypeName] ?? "#6c757d";

  console.debug(
    `%c${label}%c %s %o`,
    `background-color: ${color}; padding: 2px 4px; color: white; border-radius: 2px; font-weight: bold; font-size: 10px;`,
    "",
    `${semanticPath}:`,
    {
      timestamp: new Date().toISOString(),
      ...payload,
    },
  );
};

export const SemanticConfig: React.FC<SemanticConfigProps> = ({
  adapter: customAdapter,
  events: customEvents,
  children,
}) => {
  const adapter = customAdapter ?? consoleLogAdapter;

  const events = useMemo(
    () => resolveEvents(DEFAULT_EVENTS, customEvents),
    [customEvents],
  );

  const value = useMemo(() => ({ adapter, events }), [adapter, events]);

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfigurationContext = () => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error(
      "useConfigurationContext must be used within a SemanticConfig",
    );
  }
  return context;
};
