import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Branch, useLeaf } from "..";
import { renderTracking, target } from "./harness";

/**
 * A leaf marks its own element, so a handler can tell an event that started in
 * its subtree from one bubbling out of a nested leaf — the enclosing leaf has no
 * anchor of its own to consult, since branch anchors are found upwards.
 */
const Inner = () => {
  const { ref } = useLeaf<HTMLButtonElement>("inner leaf");

  return <button ref={ref}>Target</button>;
};

const Outer = () => {
  const { ref } = useLeaf<HTMLDivElement>("outer leaf");

  return (
    <div ref={ref}>
      <Inner />
    </div>
  );
};

describe("leaf nested in a leaf", () => {
  // The click reaches both elements by bubbling, but only the leaf it happened
  // in was activated: a second log claims the user clicked `outer leaf`, which
  // would double-count the event and misattribute it.
  it("logs one click, attributed to the leaf it happened in", () => {
    const { calls } = renderTracking(
      <Branch label="Branch">
        <Outer />
      </Branch>,
    );

    fireEvent.click(target());

    expect(calls.map((call) => call.path)).toEqual(["Branch > inner leaf"]);
  });

  // Same bubbling path, opposite event: `mouseenter` does not bubble, so the
  // enclosing leaf correctly stays quiet.
  it("logs no hover on the enclosing leaf", () => {
    const { calls } = renderTracking(
      <Branch label="Branch" events={{ hover: true }}>
        <Outer />
      </Branch>,
    );

    fireEvent.mouseEnter(target());

    expect(calls.map((call) => call.path)).toEqual(["Branch > inner leaf"]);
  });

  // The gate must not be too strict: a plain element inside a leaf is that
  // leaf's own business, and there is no nested leaf to take the blame.
  it("still logs a click on a plain descendant of the leaf", () => {
    const Plain = () => {
      const { ref } = useLeaf<HTMLDivElement>("outer leaf");

      return (
        <div ref={ref}>
          <button>Plain Target</button>
        </div>
      );
    };

    const { calls } = renderTracking(
      <Branch label="Branch">
        <Plain />
      </Branch>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Plain Target" }));

    expect(calls.map((call) => call.path)).toEqual(["Branch > outer leaf"]);
  });
});
