import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSemanticContext } from "./Branch";
import {
  useConfigurationContext,
  type TrackingOptions,
} from "./SemanticConfig";

/** Parses a JSON DOM attribute, falling back when absent or malformed. */
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

type MetadataResolver = (event: Event | undefined) => unknown;

/** Enumerated, not `unknown`, so a resolver literal gets `event` typed. */
type MetadataValue =
  | MetadataResolver
  | string
  | number
  | boolean
  | bigint
  | object
  | null
  | undefined;

/**
 * Calls function-valued entries with the triggering event (`undefined` for
 * events without one). Must be synchronous; a throw drops only that key.
 */
const resolveMetadata = (
  metadata: Record<string, MetadataValue>,
  event: Event | undefined,
): Record<string, any> => {
  let resolved: Record<string, any> = metadata;
  let copied = false;

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "function") continue;

    // Copy lazily, so data-only metadata is returned as-is.
    if (!copied) {
      resolved = { ...metadata };
      copied = true;
    }

    try {
      // `object` in the union can hold functions, so narrow explicitly.
      resolved[key] = (value as MetadataResolver)(event);
    } catch {
      delete resolved[key];
    }
  }

  return resolved;
};

interface UseLeafOutput<T extends HTMLElement = HTMLElement> {
  /** Attach to the target element. A callback ref, so effects re-run on mount/unmount. */
  ref: (node: T | null) => void;
  /** The tracked node, or `null` when unmounted — no `.current`, unlike a ref object. */
  element: T | null;
}

/**
 * Logs the tracked events for one element; attach the returned `ref` to it.
 * `metadata` values may be functions, resolved at event time with the event.
 */
export const useLeaf = <T extends HTMLElement = HTMLElement>(
  label: string,
  metadata: Record<string, MetadataValue> = {},
  eventOverrides: TrackingOptions = {},
): UseLeafOutput<T> => {
  const { adapter, events: globalEvents } = useConfigurationContext();
  const semanticContext = useSemanticContext();

  // Overrides win over the branch chain and global config. Resolved per flag and
  // memoised on those flags, so a fresh overrides object per render is harmless.
  const inheritedEvents = semanticContext?.events ?? globalEvents;
  const {
    mount = inheritedEvents.mount,
    hover = inheritedEvents.hover,
    click = inheritedEvents.click,
    focus = inheritedEvents.focus,
    visible = inheritedEvents.visible,
    scrolledAway = inheritedEvents.scrolledAway,
    unmount = inheritedEvents.unmount,
  } = eventOverrides;

  const events = useMemo(
    () => ({ mount, hover, click, focus, visible, scrolledAway, unmount }),
    [mount, hover, click, focus, visible, scrolledAway, unmount],
  );

  const [element, setElement] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => {
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

  const logEvent = useCallback(
    (eventType: string, targetElement: HTMLElement, event?: Event) => {
      // The DOM is the source of truth for the hierarchy: context cannot see a
      // provider declared in the same component's JSX. Leaves do not tag
      // themselves, so this only ever matches a branch anchor.
      const nearestProvider = targetElement.closest("[data-semantic-path]");

      const domPath = nearestProvider?.getAttribute("data-semantic-path");
      const domMetadata = nearestProvider?.getAttribute(
        "data-semantic-metadata",
      );
      const domEventsStr = nearestProvider?.getAttribute(
        "data-semantic-events",
      );

      const baseMetadata = parseJsonAttribute<Record<string, any>>(
        domMetadata,
        {},
      );
      // Precedence: leaf overrides > branch chain from the DOM > context.
      const baseEvents = {
        ...parseJsonAttribute<Required<TrackingOptions>>(domEventsStr, events),
        ...eventOverridesRef.current,
      };

      if (!baseEvents[eventType as keyof TrackingOptions]) {
        return;
      }

      const resolvedPath = domPath
        ? `${domPath} > ${labelRef.current}`
        : labelRef.current;

      const combinedMetadata = {
        ...baseMetadata,
        ...resolveMetadata(metadataRef.current, event),
        eventType,
        role: targetElement.getAttribute("role") ?? undefined,
        tagName: targetElement.tagName.toLowerCase(),
      };

      adapter(resolvedPath, combinedMetadata);
    },
    [adapter, events],
  );

  useEffect(() => {
    if (!element) return;

    if (events.mount && lastMountedElement.current !== element) {
      logEvent("mount", element);
      lastMountedElement.current = element;
    }

    // Logged as they happen: a click does not suppress the hover before it.
    const handleClick = (event: MouseEvent) => {
      logEvent("click", element, event);
    };

    const handleMouseEnter = (event: MouseEvent) => {
      logEvent("hover", element, event);
    };

    const handleFocus = (event: FocusEvent) => {
      logEvent("focus", element, event);
    };

    if (events.click) {
      element.addEventListener("click", handleClick);
    }

    if (events.hover) {
      element.addEventListener("mouseenter", handleMouseEnter);
    }

    if (events.focus) {
      element.addEventListener("focus", handleFocus);
    }

    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("focus", handleFocus);
    };
  }, [
    element,
    logEvent,
    events.mount,
    events.click,
    events.hover,
    events.focus,
  ]);

  // useLayoutEffect cleans up before the DOM node is detached, ensuring the branch anchor is still reachable.
  useLayoutEffect(() => {
    if (!element) return;

    return () => {
      if (events.unmount) {
        logEvent("unmount", element);
      }
    };
  }, [element, logEvent, events.unmount]);

  useEffect(() => {
    if (!element || (!events.visible && !events.scrolledAway)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!hasLoggedVisibleRef.current && events.visible) {
            logEvent("visible", element);
          }
          hasLoggedVisibleRef.current = true;
        } else {
          if (hasLoggedVisibleRef.current && events.scrolledAway) {
            logEvent("scrolledAway", element);
          }
          hasLoggedVisibleRef.current = false;
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, logEvent, events.visible, events.scrolledAway]);

  return { ref, element };
};
