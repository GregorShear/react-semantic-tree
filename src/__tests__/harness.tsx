import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";

import { SemanticConfig, type LoggerAdapter } from "..";
import type { JsonObject } from "../metadata";
import type { TrackingOptions } from "../SemanticConfig";

export interface LoggedCall {
  path: string;
  metadata: JsonObject;
}

/**
 * Renders `ui` under a `SemanticConfig` whose adapter collects every log.
 * `events` is the global tracking config; a branch's flags reach a leaf only
 * through the DOM anchor, never through context, so this is not "the rest of
 * the tree" — `ui` has to carry its own branches.
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
