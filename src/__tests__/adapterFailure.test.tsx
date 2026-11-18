import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Branch,
  SemanticConfig,
  useLeaf,
  type LoggerAdapter,
  type TrackingOptions,
} from "..";
import { target } from "./harness";

const Leaf = () => {
  const { ref } = useLeaf<HTMLButtonElement>("child leaf");

  return <button ref={ref}>Target</button>;
};

const renderWith = (adapter: LoggerAdapter, events: TrackingOptions = {}) =>
  render(
    <SemanticConfig adapter={adapter} events={events}>
      <Branch label="Branch">
        <Leaf />
      </Branch>
    </SemanticConfig>,
  );

describe("an adapter that throws", () => {
  // The mount log runs inside a React effect. Without a boundary the exception
  // escapes the commit, React treats it as a render error, and the subtree is
  // unmounted — analytics would take the app down with it.
  it("does not abort the mount commit", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const adapter: LoggerAdapter = (_path, metadata) => {
      if (metadata?.eventType === "mount") throw new Error("mount boom");
    };

    expect(() => renderWith(adapter, { mount: true })).not.toThrow();
    expect(screen.getByRole("button", { name: "Target" })).toBeTruthy();
  });

  // `async` is assignable to a `void`-returning adapter, so a rejection is a
  // realistic failure mode and must not escape as an unhandled rejection.
  it("contains a rejected promise from an async adapter", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Deliberately returns the rejection `LoggerAdapter`'s `void` type lets
    // through: the point is that the runtime catches it.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const adapter: LoggerAdapter = () =>
      Promise.reject(new Error("async adapter boom"));

    renderWith(adapter);
    fireEvent.click(target());

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("async adapter boom"),
      );
    });
  });
});
