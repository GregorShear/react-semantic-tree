import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Branch,
  SemanticConfig,
  useLeaf,
  type JsonObject,
  type LoggerAdapter,
} from "..";
import { target } from "./harness";

const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return <button ref={ref}>Target</button>;
};

describe("<Branch> anchor", () => {
  it("refreshes the stored data when its props change", () => {
    const calls: { labels: string[]; metadata: JsonObject }[] = [];
    const adapter: LoggerAdapter = (labels, metadata = {}) => {
      calls.push({ labels: [...labels], metadata });
    };

    const renderTree = (label: string, metadata: JsonObject) => (
      <SemanticConfig adapter={adapter}>
        <Branch label={label} metadata={metadata}>
          <Leaf />
        </Branch>
      </SemanticConfig>
    );

    const { rerender } = render(renderTree("Branch", { version: 1 }));

    fireEvent.click(target());
    rerender(renderTree("Renamed", { version: 2 }));
    fireEvent.click(target());

    expect(calls.map((call) => call.labels)).toEqual([
      ["Branch", "child leaf"],
      ["Renamed", "child leaf"],
    ]);
    expect(calls.map((call) => call.metadata.version)).toEqual([1, 2]);
  });
});
