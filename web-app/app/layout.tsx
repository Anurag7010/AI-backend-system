import type { Metadata } from "next";
import { Almarai, Cormorant_Garamond } from "next/font/google";
import Providers from "@/components/providers/Providers";
import { AccessibilityWrapper } from "@/components/ui/AccessibilityWrapper";
import "../styles/globals.css";
import "@/lib/config";

const almarai = Almarai({
  subsets: ["latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    template: '%s · PrometheonAI',
    default: 'PrometheonAI — AI Document Intelligence',
  },
  description: 'Upload your documents and have natural conversations with them. Powered by RAG, streaming AI, and persistent memory.',
  keywords: ['AI', 'document', 'RAG', 'chat', 'PDF', 'question answering'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'PrometheonAI',
    title: 'PrometheonAI — AI Document Intelligence',
    description: 'Upload your documents and have natural conversations with them.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the ThemeToggle adds/removes 'dark' class on <html>
    // on the client after reading localStorage. The server renders without 'dark'.
    // This class mismatch would normally produce a React hydration warning.
    // suppressHydrationWarning tells React: "this attribute may differ between
    // server and client — that's expected, don't warn about it."
    // It only suppresses warnings one level deep — does not affect child components.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${almarai.variable} ${cormorant.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          <AccessibilityWrapper>
            {children}
          </AccessibilityWrapper>
        </Providers>
      </body>
    </html>
  );
}
