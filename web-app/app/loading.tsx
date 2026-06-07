// Global Suspense fallback — shown while any page in the app loads.
// Next.js automatically wraps page.tsx in a Suspense boundary when loading.tsx exists.
// Server Component — no interactivity needed, just visual feedback.

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-mid/30 border-t-ember" />
    </div>
  );
}

