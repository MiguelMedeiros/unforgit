"use client";

import { ReactNode } from "react";
import { SyncProvider } from "./sync-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <SyncProvider>{children}</SyncProvider>;
}
