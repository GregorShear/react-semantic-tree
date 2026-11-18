import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Branch, useLeaf, type JsonObject } from "..";
import { renderTracking, target } from "./harness";

const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return <button ref={ref}>Target</button>;
};

/** The value a plain-JS caller can still pass where the type says otherwise. */
const unsafe = (value: unknown) => value as JsonObject;

describe("metadata that JSON cannot represent", () => {
  it("drops only the offending key and keeps the chain", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { calls } = renderTracking(
      <Branch label="BigIntBranch" metadata={unsafe({ id: "abc", count: 10n })}>
        <Branch label="Inner" metadata={{ ok: true }}>
          <Leaf />
        </Branch>
      </Branch>,
    );

    fireEvent.click(target());

    expect(calls[0].path).toBe("BigIntBranch > Inner > child leaf");
    expect(calls[0].metadata).toMatchObject({ id: "abc", ok: true });
    expect(calls[0].metadata).not.toHaveProperty("count");
    // The warning names the key, so the caller can find it.
    expect(warn.mock.calls[0][0]).toContain("count");
  });

  // Leaf metadata never passes through a DOM attribute, so it needs its own guard.
  it("drops a leaf value the request could not carry", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const LeafWithBadMetadata = () => {
      const { ref } = useLeaf<HTMLButtonElement>(
        "bad leaf",
        unsafe({ keep: "yes", bad: 1n }),
      );

      return <button ref={ref}>Target</button>;
    };

    const { calls } = renderTracking(<LeafWithBadMetadata />);

    fireEvent.click(target());

    expect(calls[0].metadata).toMatchObject({
      keep: "yes",
      eventType: "click",
    });
    expect(calls[0].metadata).not.toHaveProperty("bad");
  });
});
