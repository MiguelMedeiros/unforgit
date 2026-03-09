import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Unforgit",
  description: "Repository memory system for agents and developers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-[family-name:var(--font-inter),-apple-system,BlinkMacSystemFont,system-ui,sans-serif]`}
      >
        <Providers>
          <div className="flex h-screen flex-col overflow-hidden bg-background">
            <Header />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(28, 28, 30, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#f5f5f7",
              backdropFilter: "blur(20px)",
            },
          }}
        />
      </body>
    </html>
  );
}
