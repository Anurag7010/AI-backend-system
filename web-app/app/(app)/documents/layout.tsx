import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Documents",
    default: "Documents",
  },
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
