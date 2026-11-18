declare const process: { env: { NODE_ENV?: string } };
const DEVELOPMENT_MODES: ReadonlySet<string> = new Set([
  "development",
  "dev",
  "local",
  "test",
]);

export function isDevelopment(): boolean {
  try {
    return DEVELOPMENT_MODES.has(process.env.NODE_ENV ?? "");
  } catch {
    return false;
  }
}
