import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Home",
};

// This page exists only to redirect — no UI needed.
// Server Component so redirect() works (redirect() cannot be used in Client Components
// during render — only in event handlers via router.push())
export default async function RootPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  redirect("/login");
}
