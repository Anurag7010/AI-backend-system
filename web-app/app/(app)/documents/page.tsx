// This page is intentionally thin — it delegates all behavior to DocumentManager.
// DocumentManager is 'use client' and handles its own data fetching via useDocuments.
// Keeping this page as a Server Component means:
// - The page shell (inside the documents layout) renders on the server
// - DocumentManager hydrates and takes over client-side data fetching
// - If we need to add server-fetched data alongside DocumentManager later,
//   we can do so here without refactoring the feature component

import { DocumentManager } from "@/components/features/DocumentManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DocumentsPage() {
  return <DocumentManager />;
}
