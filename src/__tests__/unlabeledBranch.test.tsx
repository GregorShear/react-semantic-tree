import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Branch, useLeaf } from "..";
import type { TrackingOptions } from "../SemanticConfig";
import { renderTracking, target } from "./harness";

const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return <button ref={ref}>Target</button>;
};

/**
 * The leaf and the `<Branch>` it belongs to are rendered by the *same*
 * component. React context could not see that provider, but the library never
 * reads context: only the DOM anchor carries the branch's own flags.
 */
const LeafInliningItsOwnBranch = ({
  events,
  label,
}: {
  events: TrackingOptions;
  label: string;
}) => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return (
    <Branch label={label} events={events}>
      <button ref={ref}>Target</button>
    </Branch>
  );
};

describe("unlabeled <Branch>", () => {
  // An empty path is stored as such rather than published as a segment, which
  // is why the anchor is a separate marker attribute. A branch that adds
  // metadata but no segment still reaches the leaf, and the path stays the
  // leaf's own label rather than gaining a leading separator.
  it("publishes its metadata when it adds no path segment", () => {
    const { calls } = renderTracking(
      <Branch metadata={{ appVersion: "1.0.0" }}>
        <Leaf />
      </Branch>,
    );

    fireEvent.click(target());

    expect(calls).toHaveLength(1);
    expect(calls[0].labels).toEqual(["child leaf"]);
    expect(calls[0].metadata).toMatchObject({ appVersion: "1.0.0" });
  });

  // Boundary: once an ancestor contributes a segment the unlabeled branch has an
  // inherited path to re-register, so the leaf sees it. The root-level case
  // above registers no segment at all and is still found.
  it("keeps its metadata when nested under a labeled branch", () => {
    const { calls } = renderTracking(
      <Branch label="Outer" metadata={{ outer: true }}>
        <Branch metadata={{ inner: true }}>
          <Leaf />
        </Branch>
      </Branch>,
    );

    fireEvent.click(target());

    expect(calls).toHaveLength(1);
    expect(calls[0].labels).toEqual(["Outer", "child leaf"]);
    expect(calls[0].metadata).toMatchObject({ outer: true, inner: true });
  });
});

describe("branch flags vs. ambient config", () => {
  // The only place `hover: true` appears is the branch's `events` prop, i.e. the
  // DOM anchor. Context says `false`, so the enable is lost unless flags are
  // resolved from the anchor before deciding to attach.
  it("enables an event the ambient config disabled", () => {
    const { callsOfType } = renderTracking(
      <LeafInliningItsOwnBranch label="Inner" events={{ hover: true }} />,
    );

    fireEvent.mouseEnter(target());

    expect(callsOfType("hover").map((call) => call.labels)).toEqual([
      ["Inner", "child leaf"],
    ]);
  });

  // The opposite direction: the ambient config enables the event, the branch
  // turns it off. Pinning the observable outcome guards both the
  // attach-listener decision and the per-event gate in `logEvent`.
  it("keeps vetoing an event the ambient config enabled", () => {
    const { callsOfType } = renderTracking(
      <LeafInliningItsOwnBranch label="Inner" events={{ hover: false }} />,
      { hover: true },
    );

    fireEvent.mouseEnter(target());

    expect(callsOfType("hover")).toHaveLength(0);
  });
});
