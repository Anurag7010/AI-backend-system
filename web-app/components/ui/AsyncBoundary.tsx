"use client";

import React from "react";
import { AsyncState } from "../../types";
import { assertNever } from "../../types";

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  renderSuccess: (data: T) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string) => React.ReactNode;
  renderIdle?: () => React.ReactNode;
}

export function AsyncBoundary<T>({
  state,
  renderSuccess,
  renderLoading,
  renderError,
  renderIdle,
}: AsyncBoundaryProps<T>): React.ReactElement | null {
  switch (state.status) {
    case "idle":
      return (renderIdle?.() ?? null) as React.ReactElement | null;

    case "loading":
      return (renderLoading?.() ?? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )) as React.ReactElement;

    case "error":
      return (renderError?.(state.error) ?? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )) as React.ReactElement;

    case "success":
      return renderSuccess(state.data) as React.ReactElement;

    default:
      // assertNever ensures TypeScript catches any new AsyncState variants
      // that are added to the discriminated union but not handled here.
      // Without this, a new status would silently fall through and render nothing.
      return assertNever(state, "Unhandled AsyncState status");
  }
}
