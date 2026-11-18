import type { JsonObject } from "./metadata";
import type { TrackingOptions } from "./SemanticConfig";

const mergeLayers = <T extends object>(
  ...layers: (Partial<T> | undefined)[]
): Partial<T> => {
  const merged: Record<string, unknown> = {};

  for (const layer of layers) {
    if (!layer) continue;

    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) merged[key] = value;
    }
  }

  return merged as Partial<T>;
};

export const resolveEvents = (
  base: Required<TrackingOptions>,
  ...layers: (TrackingOptions | undefined)[]
): Required<TrackingOptions> => ({
  ...base,
  ...mergeLayers<Required<TrackingOptions>>(...layers),
});

export const mergeMetadata = (
  base: JsonObject,
  ...layers: (JsonObject | undefined)[]
): JsonObject =>
  // `Partial<JsonObject>` admits `undefined` values, which `mergeLayers` never writes.
  ({ ...base, ...mergeLayers<JsonObject>(...layers) }) as JsonObject;
