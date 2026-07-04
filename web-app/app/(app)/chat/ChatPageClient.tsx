"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";

const ChatInterface = dynamic(
  () =>
    import("@/components/features/ChatInterface").then(
      (m) => m.ChatInterface,
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full bg-ember-black">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  },
);

interface ChatPageClientProps {
  documentId: string | undefined;
  contextDocumentName: string | null;
  contextDocumentStatus: string | null;
}

export function ChatPageClient({
  documentId: initialDocumentId,
  contextDocumentName,
}: ChatPageClientProps) {
  const [activeDocumentId] = useState(initialDocumentId);

  return (
    <div className="flex h-full flex-col bg-ember-black">
      <ChatInterface
        documentId={activeDocumentId}
        documentName={contextDocumentName ?? undefined}
      />
    </div>
  );
}
