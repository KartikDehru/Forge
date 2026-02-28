"use client";

import { useEffect, useState } from "react";
import { SESSION_KEY, STORE_KEY } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { BootScreen } from "@/components/layout/boot-screen";

/**
 * Reads persisted workspace + session state on the client before rendering the
 * app, and keeps tabs in step when another tab writes to localStorage.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.init);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useWorkspaceStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      initAuth();
      setHydrated(true);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORE_KEY) void useWorkspaceStore.persist.rehydrate();
      if (event.key === SESSION_KEY) initAuth();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [initAuth]);

  if (!hydrated) return <BootScreen />;
  return <>{children}</>;
}
