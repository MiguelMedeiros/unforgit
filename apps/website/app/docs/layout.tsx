import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs-sidebar";

export const metadata: Metadata = {
  title: "Documentation - Unforgit",
  description:
    "Technical documentation for Unforgit - CLI reference, MCP server setup, Docker deployment, and API reference.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dracula-background">
      <DocsSidebar />
      <main className="lg:pl-64">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 lg:pt-20 lg:pb-20">{children}</div>
      </main>
    </div>
  );
}
