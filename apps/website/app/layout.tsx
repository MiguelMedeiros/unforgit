import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "unforgit - Like git, but for AI memory.",
  description:
    "A repository memory system that gives AI agents persistent knowledge across sessions. Store, recall, and share context with your team.",
  keywords: [
    "AI",
    "agents",
    "memory",
    "repository",
    "knowledge base",
    "MCP",
    "Cursor",
    "Claude",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
