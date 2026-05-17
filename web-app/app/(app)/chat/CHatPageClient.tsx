"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/features/ChatInterface";
import { DocumentStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DocumentStatus } from "@/types";

interface ChatPageClientProps {
  documentId: string | undefined;
  contextDocumentName: string | null;
  contextDocumentStatus: DocumentStatus | null;
}

export function ChatPageClient({
  documentId: initialDocumentId,
  contextDocumentName,
  contextDocumentStatus,
}: ChatPageClientProps) {
  const router = useRouter();

  // documentId may be cleared by the user — track it in state
  const [activeDocumentId, setActiveDocumentId] = useState(initialDocumentId);

  function clearDocumentContext() {
    setActiveDocumentId(undefined);
    // Update URL without a full navigation — removes documentId from query string
    router.replace("/chat");
  }

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6 space-y-3">
        <h1 className="text-display-sm text-foreground">Chat</h1>

        {/* Context banner — shown when chatting about a specific document */}
        {activeDocumentId && contextDocumentName && (
          <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20 px-4 py-2.5">
            <span className="text-sm text-brand-700 dark:text-brand-300">
              Asking about:
            </span>
            <span className="text-sm font-medium text-brand-900 dark:text-brand-100 flex-1 truncate">
              {contextDocumentName}
            </span>
            {contextDocumentStatus && (
              <DocumentStatusBadge status={contextDocumentStatus} />
            )}
            <button
              onClick={clearDocumentContext}
              aria-label="Clear document context"
              className="text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
