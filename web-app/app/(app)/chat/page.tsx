import { Metadata } from "next";
import { documentsRepository } from "@/db";
import { ChatPageClient } from "./ChatPageClient";

export const metadata: Metadata = { title: "Chat" };

type ChatPageProps = {
  searchParams: { documentId?: string };
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const documentId = searchParams.documentId;

  // If a documentId was passed (from the document detail page),
  // fetch the document on the server to show context in the banner.
  // searchParams cannot be accessed in Client Components directly —
  // they are only available in Server Components and Route Handlers.
  // We read them here and pass the result as a prop to the Client Component.
  const contextDocument = documentId
    ? await documentsRepository.findById(documentId)
    : null;

  return (
    <ChatPageClient
      documentId={documentId}
      contextDocumentName={contextDocument?.filename ?? null}
      contextDocumentStatus={contextDocument?.status ?? null}
    />
  );
}
