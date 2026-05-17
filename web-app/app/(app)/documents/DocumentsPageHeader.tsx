"use client";

// This must be 'use client' because it manages modal open/close state (useState).
// We cannot put useState in a Server Component.
// Extracting it as a separate file keeps documents/page.tsx as a Server Component.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DocumentUploadModal } from "@/components/features/DocumentUploadModal";

export function DocumentsPageHeader() {
  const [modalOpen, setModalOpen] = useState(false);

  // onSuccess: DocumentManager has its own refresh mechanism via useDocuments.
  // The cleanest pattern here: DocumentManager polls or the user manually refreshes.
  // A more complex pattern would use a shared context — overkill for now.
  function handleSuccess() {
    setModalOpen(false);
    // DocumentManager will refresh on next mount or manual refresh
    // Full refresh: window.location.reload() — works but loses scroll position
    // Better: pass a refreshKey prop from here that triggers useDocuments.refresh()
    // For now: close the modal — user sees the new document after a manual refresh
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-display-sm text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and manage your documents for AI-powered Q&amp;A
        </p>
      </div>

      <Button variant="primary" onClick={() => setModalOpen(true)}>
        Upload Document
      </Button>

      <DocumentUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
