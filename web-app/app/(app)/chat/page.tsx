import { ChatInterface } from "@/components/features/ChatInterface";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
};

export default function ChatPage({
  searchParams,
}: {
  searchParams: { documentId?: string };
}) {
  // documentId passed from /documents/[id] via the 'Ask about this document' link
  // ChatInterface uses this to pre-filter queries to a specific document
  const documentId = searchParams.documentId;

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chat</h1>
        <p className="text-sm text-gray-500 mt-1">
          {documentId
            ? "Asking questions about a specific document"
            : "Ask questions across all your documents"}
        </p>
      </div>

      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
