import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "unforgit.remote",
  description: "Remote admin panel for Unforgit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open_Sans','Helvetica_Neue',sans-serif]"
      >
        <AppShell>{children}</AppShell>
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
