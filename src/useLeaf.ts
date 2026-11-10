import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ANCHOR_ATTRIBUTE,
  EVENTS_ATTRIBUTE,
  LEAF_ATTRIBUTE,
  METADATA_ATTRIBUTE,
  PATH_ATTRIBUTE,
} from "./attributes";
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

/**
 * Selector for the DOM anchor `Branch` publishes on its wrapper. Matches the
 * marker, not the path attribute: an unlabeled root branch publishes no path but
 * still carries merged metadata and flags, so it must be found.
 */
const BRANCH_ANCHOR = `[${ANCHOR_ATTRIBUTE}]`;

/** Selector for a tracked element, to find where a bubbled event started. */
const TRACKED_LEAF = `[${LEAF_ATTRIBUTE}]`;

/** Drops explicit `undefined`, so an unset prop cannot clobber an inherited flag. */
const definedFlags = (options: TrackingOptions): TrackingOptions => {
  const result = { ...options };
  for (const key of Object.keys(result) as (keyof TrackingOptions)[]) {
    if (result[key] === undefined) delete result[key];
  }
  return result;
};

/**
 * Tracking flags for one element. `Branch` publishes its fully merged flags on
 * the nearest anchor, so the DOM already carries the whole context chain; the
 * leaf's own overrides go last. Used for listener attachment and for the
 * per-event log gate alike, so a branch rendered by the leaf's own component —
 * which context cannot see — can enable an event as well as disable it.
 */
const anchorEvents = (
  anchor: Element | null,
  inherited: Required<TrackingOptions>,
  overrides: TrackingOptions,
): Required<TrackingOptions> => ({
  ...inherited,
  ...parseJsonAttribute<Partial<TrackingOptions>>(
    anchor?.getAttribute(EVENTS_ATTRIBUTE),
    {},
  ),
  ...definedFlags(overrides),
});

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

  const logEvent = useCallback(
    (eventType: string, targetElement: HTMLElement, event?: Event) => {
      // The DOM is the source of truth for the hierarchy: context cannot see a
      // provider declared in the same component's JSX. A leaf marks itself with a
      // different attribute, so this only ever matches a branch anchor.
      const nearestProvider = targetElement.closest(BRANCH_ANCHOR);

      const domPath = nearestProvider?.getAttribute(PATH_ATTRIBUTE);
      const domMetadata = nearestProvider?.getAttribute(METADATA_ATTRIBUTE);

      const baseMetadata = parseJsonAttribute<Record<string, any>>(
        domMetadata,
        {},
      );
      // Precedence: leaf overrides > branch chain from the DOM > context.
      const baseEvents = anchorEvents(
        nearestProvider,
        events,
        eventOverridesRef.current,
      );

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

    const effective = anchorEvents(
      element.closest(BRANCH_ANCHOR),
      events,
      eventOverridesRef.current,
    );

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

      logEvent("click", element, event);
    };

    const handleMouseEnter = (event: MouseEvent) => {
      logEvent("hover", element, event);
    };

    const handleFocus = (event: FocusEvent) => {
      logEvent("focus", element, event);
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
  }, [element, logEvent, events]);

  // useLayoutEffect cleans up before the DOM node is detached, ensuring the branch anchor is still reachable.
  useLayoutEffect(() => {
    if (!element) return;

    return () => {
      // Read at cleanup time: the anchor is still attached, and its flags are
      // therefore the freshest available.
      const effective = anchorEvents(
        element.closest(BRANCH_ANCHOR),
        events,
        eventOverridesRef.current,
      );
      if (effective.unmount) {
        logEvent("unmount", element);
      }
    };
  }, [element, logEvent, events]);

  useEffect(() => {
    if (!element) return;

    const effective = anchorEvents(
      element.closest(BRANCH_ANCHOR),
      events,
      eventOverridesRef.current,
    );
    if (!effective.visible && !effective.scrolledAway) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!hasLoggedVisibleRef.current && effective.visible) {
            logEvent("visible", element);
          }
          hasLoggedVisibleRef.current = true;
        } else {
          if (hasLoggedVisibleRef.current && effective.scrolledAway) {
            logEvent("scrolledAway", element);
          }
          hasLoggedVisibleRef.current = false;
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, logEvent, events]);

  return { ref, element };
};
