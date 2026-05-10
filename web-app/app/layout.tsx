import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/providers/Providers";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  // variable: creates a CSS custom property instead of applying the font directly.
  // This lets us use var(--font-inter) in tailwind.config.ts fontFamily.sans.
  // Without variable: the font is applied directly to elements, not accessible as a CSS var.
  variable: "--font-inter",
  display: "swap", // show fallback font immediately, swap when Inter loads
});

export const metadata: Metadata = {
  title: {
    template: "%s | AI Product",
    default: "AI Product",
  },
  description: "AI-powered document Q&A and retrieval system",
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
        className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          {/* ThemeToggle can be added to a top-level nav or header component:
              <header>
                <ThemeToggle />
              </header>
          */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
