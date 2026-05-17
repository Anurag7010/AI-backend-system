"use client";

// SignOutButton must be a Client Component because:
// 1. It uses useRouter() for programmatic navigation after sign out
// 2. onClick event handlers are Client Component only
// Sidebar is a Server Component — it cannot contain event handlers directly,
// so sign out logic is extracted here.

import { useRouter } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await clearSessionCookie();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      Sign out
    </button>
  );
}
