"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.init);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  useEffect(() => {
    initAuth();
    hydrate();
  }, [initAuth, hydrate]);

  return <>{children}</>;
}