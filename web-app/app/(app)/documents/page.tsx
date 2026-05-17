import type { Metadata } from "next";
import { DocumentsPageHeader } from "./DocumentsPageHeader";
import { DocumentManager } from "@/components/features/DocumentManager";

export const metadata: Metadata = { title: "Documents" };

// This page is intentionally thin. The Server/Client boundary lives here:
// - This Server Component renders the static shell (header + layout)
// - DocumentManager is 'use client' and owns all data fetching via useDocuments
// If we tried to render DocumentManager directly in a Server Component and pass data,
// we could not also give it the interactive upload/delete behavior it needs.
// Keeping it 'use client' lets it use useState, useEffect, and our custom hooks.
export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* DocumentsPageHeader is 'use client' — manages modal open/close state */}
      <DocumentsPageHeader />

      {/* DocumentManager owns its own data — fetches on mount via useDocuments */}
      <DocumentManager />
    </div>
  );
}
