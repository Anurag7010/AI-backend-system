// Metadata cannot be exported from a 'use client' component.
// Solution: wrap the Client Component form in a Server Component page
// that exports the metadata. The page itself has no UI — just renders the form.
// This is the Next.js recommended pattern for pages that need both
// metadata and client-side interactivity.

import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to PrometheonAI — ask questions about your documents and get cited, grounded answers.",
};

export default function LoginPage() {
  // Server Component page — renders the Client Component form
  // metadata lives here, interactivity lives in LoginForm
  return <LoginForm />;
}
