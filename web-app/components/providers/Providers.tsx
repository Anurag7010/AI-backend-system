"use client";

// Providers must be 'use client' because React context (createContext, useContext)
// only works in Client Components. Server Components have no concept of context —
// they run per-request with no shared state across the tree.
//
// Why a separate file instead of inline in layout.tsx:
// layout.tsx is a Server Component — if we add 'use client' to it directly,
// the entire root layout becomes a Client Component, losing server rendering
// for the entire app. Extracting Providers into a separate 'use client' file
// keeps layout.tsx as a Server Component while still wrapping children in context.

import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Add providers here as they are built: */}
      {/* <ToastProvider> */}
      {/* <ThemeProvider> */}
      {/* <AuthProvider> */}
      {children}
      {/* </AuthProvider> */}
      {/* </ThemeProvider> */}
      {/* </ToastProvider> */}
    </>
  );
}
