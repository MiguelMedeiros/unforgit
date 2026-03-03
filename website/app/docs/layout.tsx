import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs-sidebar";

export const metadata: Metadata = {
  title: "Documentation - Hippocampus",
  description:
    "Technical documentation for Hippocampus - CLI reference, MCP server setup, Docker deployment, and API reference.",
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
        <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20">{children}</div>
      </main>
    </div>
  );
}
