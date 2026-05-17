"use client";

import React from "react";
import type { DocumentSummary, DocumentId, DocumentStatus } from "../../types";
import { assertNever } from "../../types";

// Record<DocumentStatus, string> enforces exhaustive mapping at the type level.
// If a new DocumentStatus is added (e.g. 'archived'), TypeScript will error here
// because the Record type requires all keys to be present.
const STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  ingested: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function DocumentCard({
  document,
  onDelete,
}: {
  document: DocumentSummary;
  onDelete?: (id: DocumentId) => void;
}): React.ReactElement {
  const statusColor = STATUS_COLORS[document.status];

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">
          {document.filename}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(document.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
        >
          {document.status}
        </span>

        {onDelete && (
          <button
            onClick={() => onDelete(document.id)}
            className="text-xs text-red-500 hover:text-red-700"
            aria-label={`Delete ${document.filename}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
