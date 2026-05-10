import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/providers/Providers";
import "./globals.css";

// Inter loaded at build time — no runtime request, no layout shift
// subsets: latin covers standard Western characters
const inter = Inter({ subsets: ["latin"] });

// %s is replaced by each page's title — e.g. 'Dashboard | AI Product'
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
    <html lang="en">
      {/* inter.className applies the font CSS variable to the body */}
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
