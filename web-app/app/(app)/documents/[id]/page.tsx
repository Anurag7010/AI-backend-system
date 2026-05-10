import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Document } from "@/types";

// Stub — replace with real db call
async function getDocumentById(id: string): Promise<Document | null> {
  // Real: return documentsRepository.findById(id)
  if (id === "not-found") return null;

  return {
    id: id as any,
    userId: "stub-user" as any,
    filename: `document-${id}.pdf`,
    status: "ingested",
    chunkCount: 24,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(),
  };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const doc = await getDocumentById(params.id);
  if (!doc) return { title: "Document Not Found" };
  return { title: doc.filename };
}

// Status badge — purely presentational, no interactivity
function StatusBadge({ status }: { status: Document["status"] }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    ingested: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

// DocumentDetail is a Server Component — no interactivity except the
// 'Ask about this document' link (which is just a Link, not an event handler)
function DocumentDetail({ document }: { document: Document }) {
  return (
    <div className="space-y-6">
      {/* Document header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {document.filename}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Uploaded {document.createdAt.toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={document.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Chunks</p>
            <p className="font-medium text-gray-900">{document.chunkCount}</p>
          </div>
          <div>
            <p className="text-gray-500">Last updated</p>
            <p className="font-medium text-gray-900">
              {document.updatedAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Link to chat with this document pre-selected */}
        {document.status === "ingested" && (
          <Link
            href={`/chat?documentId=${document.id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Ask about this document
          </Link>
        )}
      </div>

      {/* Queries section — stub */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Queries</h3>
        <p className="text-sm text-gray-400">
          No queries yet. Ask a question about this document above.
        </p>
      </div>
    </div>
  );
}

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const document = await getDocumentById(params.id);

  // notFound() triggers not-found.tsx — correct HTTP 404 behavior
  if (!document) notFound();

  return (
    <div className="p-8">
      <DocumentDetail document={document} />
    </div>
  );
}
