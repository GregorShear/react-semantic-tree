export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

interface SanitizedMetadata {
  safe: JsonObject;
  stripped: string[] | undefined;
}

export const sanitize = (metadata: JsonObject): SanitizedMetadata => {
  try {
    return {
      safe: JSON.parse(JSON.stringify(metadata)) as JsonObject,
      stripped: undefined,
    };
  } catch {
    const salvaged: JsonObject = {};
    const stripped: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      try {
        JSON.stringify(value);
        salvaged[key] = value;
      } catch {
        stripped.push(key);
      }
    }

    try {
      return {
        safe: JSON.parse(JSON.stringify(salvaged)) as JsonObject,
        stripped,
      };
    } catch {
      // Unreachable in principle: every surviving key serialised on its own.
      return { safe: {}, stripped: [...stripped, ...Object.keys(salvaged)] };
    }
  }
};
