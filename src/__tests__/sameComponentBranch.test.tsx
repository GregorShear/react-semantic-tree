import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Branch, useLeaf } from "..";
import type { TrackingOptions } from "../SemanticConfig";
import { renderTracking, target } from "./harness";

/**
 * `useLeaf` runs in this component and the `<Branch>` it belongs to is rendered
 * by the *same* component. React context cannot see that provider, so the
 * leaf's resolved `events` come from its ancestors; only the DOM anchor carries
 * the branch's own flags.
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

/**
 * Version of the same shape, without a `label`: on top of the context problem,
 * this branch publishes no `data-semantic-path`, so it exercises the anchor
 * itself rather than the path value.
 */
const UnlabeledBranchWithOwnLeaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return (
    <Branch metadata={{ appVersion: "1.0.0" }} events={{ hover: true }}>
      <button ref={ref}>Target</button>
    </Branch>
  );
};

describe("same-component <Branch>", () => {
  // Both the metadata and the flags live only on the anchor: context sees the
  // ambient config, and there is no path attribute to find it by.
  it("keeps its metadata and flags when it adds no path segment", () => {
    const { callsOfType } = renderTracking(<UnlabeledBranchWithOwnLeaf />);

    fireEvent.mouseEnter(target());
    fireEvent.click(target());

    expect(callsOfType("hover")).toHaveLength(1);
    expect(callsOfType("click")[0].path).toBe("child leaf");
    expect(callsOfType("click")[0].metadata).toMatchObject({
      appVersion: "1.0.0",
    });
  });

  // The only place `hover: true` appears is the same-component branch's `events`
  // prop, i.e. the DOM anchor. Context says `false`, so the enable is lost
  // unless flags are resolved from the anchor before deciding to attach.
  it("enables an event the ambient config disabled", () => {
    const { callsOfType } = renderTracking(
      <LeafInliningItsOwnBranch label="Inner" events={{ hover: true }} />,
    );

    fireEvent.mouseEnter(target());

    expect(callsOfType("hover").map((call) => call.path)).toEqual([
      "Inner > child leaf",
    ]);
  });

  // The opposite direction: the ambient config enables the event, the
  // same-component branch turns it off. Enforced when deciding whether to
  // attach, and again per event in `logEvent`, so pinning the observable
  // outcome guards both layers.
  it("keeps vetoing an event the ambient config enabled", () => {
    const { callsOfType } = renderTracking(
      <LeafInliningItsOwnBranch label="Inner" events={{ hover: false }} />,
      { hover: true },
    );

    fireEvent.mouseEnter(target());

    expect(callsOfType("hover")).toHaveLength(0);
  });
});
