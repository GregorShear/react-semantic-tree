import React from "react";
import { Branch, type BranchProps } from "./Branch";

type WithBranchOptions = Omit<BranchProps, "label" | "children">;

type WithBranchComponent<
  P extends object,
  R = any,
> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<R>
>;

interface WithBranchFactory {
  <C extends React.ComponentType<any>, R = any>(
    Component: C,
  ): WithBranchComponent<React.ComponentProps<C>, R>;
}

/**
 * Renders a component inside a `<Branch>` without nesting its JSX, for
 * instrumenting existing code without re-indenting call sites.
 */
export function withBranch(
  label: string,
  options: WithBranchOptions = {},
): WithBranchFactory {
  const { metadata, events } = options;

  return function wrap<C extends React.ComponentType<any>, R = any>(
    Component: C,
  ): WithBranchComponent<React.ComponentProps<C>, R> {
    const WithBranch = React.forwardRef<R, React.ComponentProps<C>>(
      function WithBranchForwardRef(props, ref) {
        // Any-typed alias so JSX accepts `ref`, which a generic `C` has no prop for.
        // Runtime: a plain function component ignores it; only forwardRef/class receive it.
        const Inner: React.ComponentType<any> = Component;

        return (
          <Branch label={label} metadata={metadata} events={events}>
            <Inner {...props} ref={ref} />
          </Branch>
        );
      },
    );

    const componentName =
      Component.displayName || Component.name || "Component";

    WithBranch.displayName = `withBranch(${label})(${componentName})`;

    return WithBranch;
  };
}
