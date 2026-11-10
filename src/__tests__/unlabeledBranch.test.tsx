import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Branch, useLeaf } from "..";
import { renderTracking, target } from "./harness";

/**
 * A leaf rendered by its own component, so React context is a valid channel for
 * branch metadata. The library still reads metadata only from the nearest DOM
 * anchor, which is the point of these tests.
 */
const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return <button ref={ref}>Target</button>;
};

describe("unlabeled <Branch>", () => {
  // `Branch` omits `data-semantic-path` when the path is empty, which is why the
  // anchor is a separate marker attribute. A branch that adds metadata but no
  // segment still reaches the leaf, and the path stays the leaf's own label
  // rather than gaining a leading separator.
  it("publishes its metadata when it adds no path segment", () => {
    const { calls } = renderTracking(
      <Branch metadata={{ appVersion: "1.0.0" }}>
        <Leaf />
      </Branch>,
    );

    fireEvent.click(target());

    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe("child leaf");
    expect(calls[0].metadata).toMatchObject({ appVersion: "1.0.0" });
  });

  // Boundary: once an ancestor contributes a segment the unlabeled branch has an
  // inherited path to re-materialise, so it publishes both attributes. The
  // root-level case above publishes no path attribute at all and is still found.
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
    expect(calls[0].path).toBe("Outer > child leaf");
    expect(calls[0].metadata).toMatchObject({ outer: true, inner: true });
  });
});
