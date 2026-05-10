import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/nav/Sidebar";

// This layout wraps /dashboard, /documents, and /chat.
// Critical behavior: this layout does NOT re-mount when navigating between those pages.
// The Sidebar stays mounted — its state (scroll position, hover states) persists.
// Auth check runs once here — child pages do not need to repeat it.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // redirect() runs on the server — throws internally, no return needed.
  // Any unauthenticated request to /dashboard, /documents, /chat
  // is intercepted here and sent to /login before any page renders.
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar: fixed width, full height, does not scroll */}
      <Sidebar email={session.email} />

      {/* Main content: takes remaining width, scrolls independently */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
