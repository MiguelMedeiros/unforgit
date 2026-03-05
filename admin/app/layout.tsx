import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hippocampus Admin",
  description: "Admin panel for Hippocampus MCP server",
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
        <div className="flex min-h-screen flex-col bg-background">
          {children}
        </div>
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
