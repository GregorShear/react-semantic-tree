import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import { SemanticConfig, type LoggerAdapter } from "..";
import type { TrackingOptions } from "../SemanticConfig";

export interface LoggedCall {
  path: string;
  metadata: Record<string, any>;
}

/**
 * Renders `ui` under a `SemanticConfig` whose adapter collects every log.
 * `events` is the only tracking source React context can see here, so it plays
 * the role of "the rest of the tree".
 */
export const renderTracking = (
  ui: ReactElement,
  events: TrackingOptions = {},
) => {
  const calls: LoggedCall[] = [];
  const adapter: LoggerAdapter = (path, metadata = {}) => {
    calls.push({ path, metadata });
  };

  render(
    <SemanticConfig adapter={adapter} events={events}>
      {ui}
    </SemanticConfig>,
  );

  const callsOfType = (eventType: string) =>
    calls.filter((call) => call.metadata.eventType === eventType);

  return { calls, callsOfType };
};

export const target = () =>
  screen.getByRole("button", {
    name: "Target",
  });
