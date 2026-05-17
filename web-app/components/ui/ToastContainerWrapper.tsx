"use client";

import { useToastContext } from "@/hooks/useToast";
import { ToastContainer } from "./ToastContainer";

// Thin wrapper — reads toasts from context and passes to ToastContainer
// Kept separate so AppLayout stays a Server Component
export function ToastContainerWrapper() {
  const { toasts, dismiss } = useToastContext();
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />;
}
