import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ANCHOR_ATTRIBUTE,
  EVENTS_ATTRIBUTE,
  LEAF_ATTRIBUTE,
  METADATA_ATTRIBUTE,
  PATH_ATTRIBUTE,
} from "./attributes";
import {
  type LoggerAdapter,
  useConfigurationContext,
  type TrackingOptions,
} from "./SemanticConfig";
import { isDevelopment } from "./environment";
import { mergeMetadata, resolveEvents } from "./merge";
import { type JsonObject, sanitize } from "./metadata";

const parseJsonAttribute = <T>(
  value: string | null | undefined,
  fallback: T,
): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const BRANCH_ANCHOR = `[${ANCHOR_ATTRIBUTE}]`;

/** Selector for a tracked element, to find where a bubbled event started. */
const TRACKED_LEAF = `[${LEAF_ATTRIBUTE}]`;

const reportAdapterFailure = (cause: unknown) => {
  if (!isDevelopment()) return;

  const reason = cause instanceof Error ? cause.message : String(cause);

  console.warn(
    `[react-semantic-tree] The logger adapter threw while handling an event; ` +
      `the event was dropped and the application was left untouched. (${reason})`,
  );
};

/**
 * Calls the user adapter behind an exception boundary. It runs inside a React
 * effect and DOM listeners, so an escaping exception would abort a commit and
 * unmount the subtree, or surface as an uncaught error from a handler. Tracking
 * is best-effort: a failing adapter must not affect the application. The return
 * value is inspected too, because an `async` adapter is assignable to
 * `LoggerAdapter` and its rejection would otherwise escape as an unhandled one.
 */
const callAdapter = (
  adapter: LoggerAdapter,
  path: string,
  metadata: JsonObject,
) => {
  try {
    const result = adapter(path, metadata) as unknown;
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      Promise.resolve(result).catch(reportAdapterFailure);
    }
  } catch (cause) {
    reportAdapterFailure(cause);
  }
};

/** Flags `Branch` published on one anchor, or `{}` when there is none. */
const readAnchorFlags = (anchor: Element | null): TrackingOptions =>
  parseJsonAttribute<Partial<TrackingOptions>>(
    anchor?.getAttribute(EVENTS_ATTRIBUTE),
    {},
  );

interface UseLeafOutput<T extends HTMLElement = HTMLElement> {
  /** Attach to the target element. */
  ref: (node: T | null) => void;
  /** The tracked node, or `null` when unmounted — no `.current`, unlike a ref object. */
  element: T | null;
}

export const useLeaf = <T extends HTMLElement = HTMLElement>(
  label: string,
  metadata: JsonObject = {},
  eventOverrides: TrackingOptions = {},
): UseLeafOutput<T> => {
  const { adapter, events: globalEvents } = useConfigurationContext();

  const {
    mount = globalEvents.mount,
    hover = globalEvents.hover,
    click = globalEvents.click,
    focus = globalEvents.focus,
    visible = globalEvents.visible,
  } = eventOverrides;

  const events = useMemo(
    () => ({ mount, hover, click, focus, visible }),
    [mount, hover, click, focus, visible],
  );

  const [element, setElement] = useState<T | null>(null);
  const previousElementRef = useRef<T | null>(null);
  const ref = useCallback((node: T | null) => {
    // Mark the node so a click bubbled out of a nested leaf can be told apart
    // from one that happened here; drop the mark from the node being left.
    if (previousElementRef.current && previousElementRef.current !== node) {
      previousElementRef.current.removeAttribute(LEAF_ATTRIBUTE);
    }
    if (node) node.setAttribute(LEAF_ATTRIBUTE, "");
    previousElementRef.current = node;

    setElement(node);
  }, []);

  const lastMountedElement = useRef<T | null>(null);
  const hasLoggedVisibleRef = useRef(false);

  // Refs keep logEvent stable across renders.
  const labelRef = useRef(label);
  const metadataRef = useRef(metadata);
  // Raw overrides, not resolved defaults, so they can outrank the DOM flags.
  const eventOverridesRef = useRef(eventOverrides);

  useEffect(() => {
    labelRef.current = label;
    metadataRef.current = metadata;
    eventOverridesRef.current = eventOverrides;
  });

  const effectiveEvents = useCallback(
    (anchor: Element | null) =>
      resolveEvents(events, readAnchorFlags(anchor), eventOverridesRef.current),
    [events],
  );

  const logEvent = useCallback(
    (eventType: string, targetElement: HTMLElement) => {
      // The DOM is the only source of the hierarchy.
      const nearestProvider = targetElement.closest(BRANCH_ANCHOR);

      const domPath = nearestProvider?.getAttribute(PATH_ATTRIBUTE);
      const domMetadata = nearestProvider?.getAttribute(METADATA_ATTRIBUTE);

      const baseMetadata = parseJsonAttribute<JsonObject>(domMetadata, {});

      if (
        !effectiveEvents(nearestProvider)[eventType as keyof TrackingOptions]
      ) {
        return;
      }

      const { safe: leafMetadata, stripped } = sanitize(metadataRef.current);
      if (stripped?.length && isDevelopment()) {
        console.warn(
          `[react-semantic-tree] dropped non-JSON metadata in ` +
            `useLeaf("${labelRef.current}"): ${stripped.join(", ")}`,
        );
      }

      const resolvedPath = domPath
        ? `${domPath} > ${labelRef.current}`
        : labelRef.current;

      const combinedMetadata: JsonObject = {
        ...mergeMetadata(baseMetadata, leafMetadata),
        eventType,
        tagName: targetElement.tagName.toLowerCase(),
      };

      callAdapter(adapter, resolvedPath, combinedMetadata);
    },
    [adapter, effectiveEvents],
  );

  useEffect(() => {
    if (!element) return;

    const effective = effectiveEvents(element.closest(BRANCH_ANCHOR));

    if (effective.mount && lastMountedElement.current !== element) {
      logEvent("mount", element);
      lastMountedElement.current = element;
    }

    // Logged as they happen: a click does not suppress the hover before it.
    const handleClick = (event: MouseEvent) => {
      // A nested leaf's click bubbles up to this element too, but that leaf
      // already logged it and naming this one would misattribute a click the
      // user never made here. Only the leaf the event started in reports it.
      const target = event.target;
      if (target instanceof Element) {
        const origin = target.closest(TRACKED_LEAF);
        if (origin && origin !== element) return;
      }

      logEvent("click", element);
    };

    const handleMouseEnter = () => {
      logEvent("hover", element);
    };

    const handleFocus = () => {
      logEvent("focus", element);
    };

    if (effective.click) {
      element.addEventListener("click", handleClick);
    }

    if (effective.hover) {
      element.addEventListener("mouseenter", handleMouseEnter);
    }

    if (effective.focus) {
      element.addEventListener("focus", handleFocus);
    }

    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("focus", handleFocus);
    };
  }, [element, logEvent, effectiveEvents]);

  useEffect(() => {
    if (!element) return;

    const effective = effectiveEvents(element.closest(BRANCH_ANCHOR));
    if (!effective.visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          hasLoggedVisibleRef.current = false;
          return;
        }
        if (!hasLoggedVisibleRef.current) {
          logEvent("visible", element);
        }
        hasLoggedVisibleRef.current = true;
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, logEvent, effectiveEvents]);

  return { ref, element };
};
