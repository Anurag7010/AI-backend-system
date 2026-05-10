import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload, manage, and query your documents
        </p>
      </div>
      {children}
    </div>
  );
}
