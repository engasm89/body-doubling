"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/auth-context";
import { SessionStateProvider } from "@/context/session-state-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SessionStateProvider>{children}</SessionStateProvider>
    </AuthProvider>
  );
}
