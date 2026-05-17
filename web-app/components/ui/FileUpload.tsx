"use client";

import React, { useRef, useState } from "react";
import type { UploadStateWithProgress } from "../../types";

export function FileUpload({
  onFile,
  state,
  accept = "application/pdf",
}: {
  onFile: (file: File) => void;
  state: UploadStateWithProgress;
  accept?: string;
}): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);

  // File input must be uncontrolled — the browser controls its value for security reasons.
  // JavaScript cannot programmatically set a file input's value (would allow reading
  // arbitrary files). We only READ the value via the change event, never SET it.
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload state is owned by the parent (DocumentManager), not this component.
  // FileUpload is purely presentational — it displays state and calls onFile.
  // If FileUpload owned the upload state, it could not coordinate with the
  // document list refresh that happens after a successful upload.
  const isDisabled =
    state.status === "uploading" || state.status === "processing";

  function handleFileSelect(file: File) {
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input value so the same file can be re-uploaded after an error
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (isDisabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!isDisabled) setIsDragOver(true);
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={isDisabled}
      />

      {/* Drop zone */}
      <div
        onClick={() => !isDisabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDisabled
            ? "cursor-not-allowed border-border bg-muted"
            : isDragOver
              ? "cursor-copy border-primary bg-primary/5"
              : "cursor-pointer border-border hover:border-foreground/40"
        }`}
      >
        {state.status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Drop a PDF here or{" "}
            <span className="text-primary underline">click to browse</span>
          </p>
        )}

        {state.status === "uploading" && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              Uploading... {state.progress}%
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {state.status === "processing" && (
          <p className="text-sm text-foreground">Processing document...</p>
        )}

        {state.status === "success" && (
          <p className="text-sm text-green-600">
            ✓ Document uploaded and ingested successfully
          </p>
        )}

        {state.status === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{state.error}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="text-xs text-blue-600 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
