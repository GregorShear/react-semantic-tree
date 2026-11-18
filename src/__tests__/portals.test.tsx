import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react";
import { createPortal } from "react-dom";
import { describe, expect, it } from "vitest";

import { Branch, useLeaf } from "..";
import { renderTracking, target } from "./harness";

/** Renders its children somewhere else in the document, like a dialog does. */
const Portalled = ({ children }: { children: ReactNode }) =>
  createPortal(<>{children}</>, document.body);

const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf", { local: true });
  return <button ref={ref}>Target</button>;
};

/**
 * A portal moves the DOM node but not the React one, and a leaf reads only the
 * DOM, so the branch chain has to be re-materialised inside the portal. An
 * unlabeled, empty `<Branch>` is the minimal form: it adds no path segment and
 * carries the inherited path, metadata and flags onto a node the leaf can find.
 */
describe("portals", () => {
  it("inherits the branch chain from a <Branch> rendered inside the portal", () => {
    const { callsOfType } = renderTracking(
      <Branch
        label="User Grants"
        metadata={{ appVersion: "1.0.0" }}
        events={{ hover: false }}
      >
        <Portalled>
          <Branch>
            <Leaf />
          </Branch>
        </Portalled>
      </Branch>,
    );

    fireEvent.mouseEnter(target());
    fireEvent.click(target());

    expect(callsOfType("hover")).toHaveLength(0);
    expect(callsOfType("click")).toHaveLength(1);
    expect(callsOfType("click")[0].labels).toEqual([
      "User Grants",
      "child leaf",
    ]);
    expect(callsOfType("click")[0].metadata).toMatchObject({
      appVersion: "1.0.0",
      local: true,
    });
  });
});
