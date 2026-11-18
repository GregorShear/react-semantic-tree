import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only auto-cleans when the vitest globals are enabled; this
// project imports test utilities explicitly, so unmount each render by hand.
afterEach(cleanup);

// jsdom ships no IntersectionObserver. `useLeaf` constructs one only when
// `visible` is enabled, so tests that enable it need at least a constructible
// stub. Individual tests can override the callback.
if (!("IntersectionObserver" in globalThis)) {
  class StubIntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver;
}
