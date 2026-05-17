import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/nav/Sidebar";
import { ToastContainerWrapper } from "@/components/ui/ToastContainerWrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar email={session.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {/* ToastContainerWrapper is 'use client' — reads from ToastContext */}
      <ToastContainerWrapper />
    </div>
  );
}
