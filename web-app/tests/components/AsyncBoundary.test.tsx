import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AsyncBoundary } from "../../components/ui/AsyncBoundary";
import type { AsyncState } from "../../types";

describe("AsyncBoundary", () => {
  it("renders renderIdle output when state is idle", () => {
    const state: AsyncState<string> = { status: "idle" };
    render(
      <AsyncBoundary
        state={state}
        renderIdle={() => <div>idle content</div>}
        renderSuccess={(data: string) => <div>{data}</div>}
      />,
    );
    expect(screen.getByText("idle content")).toBeInTheDocument();
  });

  it("renders default loading indicator when renderLoading not provided", () => {
    const state: AsyncState<string> = { status: "loading" };
    const { container } = render(
      <AsyncBoundary
        state={state}
        renderSuccess={(data: string) => <div>{data}</div>}
      />,
    );
    // Default loading renders a spinner — verify some loading UI exists
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders custom renderLoading when provided", () => {
    const state: AsyncState<string> = { status: "loading" };
    render(
      <AsyncBoundary
        state={state}
        renderLoading={() => <div>custom loader</div>}
        renderSuccess={(data: string) => <div>{data}</div>}
      />,
    );
    expect(screen.getByText("custom loader")).toBeInTheDocument();
  });

  it("renders renderError with the error message", () => {
    const state: AsyncState<string> = {
      status: "error",
      error: "something broke",
    };
    render(
      <AsyncBoundary
        state={state}
        renderError={(err: string) => <div>Error: {err}</div>}
        renderSuccess={(data: string) => <div>{data}</div>}
      />,
    );
    expect(screen.getByText("Error: something broke")).toBeInTheDocument();
  });

  it("renders renderSuccess with the data", () => {
    const state: AsyncState<string> = {
      status: "success",
      data: "test data",
    };
    render(
      <AsyncBoundary
        state={state}
        renderSuccess={(data: string) => <div>{data}</div>}
      />,
    );
    expect(screen.getByText("test data")).toBeInTheDocument();
  });

  /*
   * TypeScript exhaustive check — type-level test only, not a runtime test.
   *
   * If a new variant is added to AsyncState<T>:
   *   type AsyncState<T> = ... | { readonly status: 'cancelled' }
   *
   * The switch in AsyncBoundary will reach the default case with state typed as:
   *   { readonly status: 'cancelled' }
   *
   * assertNever(state) will produce a TypeScript compile error:
   *   Argument of type '{ status: "cancelled" }' is not assignable
   *   to parameter of type 'never'.
   *
   * This forces the developer to handle the new variant before the code compiles.
   * It is a compile-time guarantee, not a runtime behavior — no test can verify it.
   */
});
