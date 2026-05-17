"use client";

import React, { useEffect } from "react";
import { useDocuments } from "../../hooks/useDocuments";
import { useUpload } from "../../hooks/useUpload";
import { useAbortController } from "../../hooks/useAbortController";
import { AsyncBoundary } from "../ui/AsyncBoundary";
import { DocumentCard } from "../ui/DocumentCard";
import { FileUpload } from "../ui/FileUpload";
import type { DocumentId } from "../../types";

export function DocumentManager(): React.ReactElement {
  const { state: docState, refresh, deleteDocument } = useDocuments();
  const { state: uploadState, upload, reset: resetUpload } = useUpload();
  const { signal, reset: resetSignal } = useAbortController();

  // Refresh document list after successful upload
  useEffect(() => {
    if (uploadState.status === "success") {
      refresh();
      // Reset upload state after a short delay so user sees success message
      setTimeout(resetUpload, 2000);
    }
  }, [uploadState.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file: File) {
    resetSignal(); // fresh signal for this upload
    await upload(file, signal);
  }

  async function handleDelete(id: DocumentId) {
    await deleteDocument(id);
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Upload zone */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Upload Document
        </h2>
        <FileUpload
          onFile={handleFile}
          state={uploadState}
          accept="application/pdf"
        />
      </section>

      {/* Document list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Documents</h2>
          <button
            onClick={refresh}
            className="text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>

        <AsyncBoundary
          state={docState}
          renderLoading={() => (
            <p className="text-center text-sm text-muted-foreground">
              Loading documents...
            </p>
          )}
          renderError={(error) => (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button onClick={refresh} className="ml-2 underline">
                Retry
              </button>
            </div>
          )}
          renderSuccess={(docs) => (
            <div className="flex flex-col gap-2">
              {docs.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  No documents yet — upload one above
                </p>
              )}
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        />
      </section>
    </div>
  );
}
