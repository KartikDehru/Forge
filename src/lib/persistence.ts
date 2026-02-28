import type { PersistStorage, StorageValue } from "zustand/middleware";
import { STORE_KEY, STORE_VERSION } from "@/lib/constants";
import { createSeedState, type SeedState } from "@/lib/seed-data";

/**
 * Everything the app persists. Data lives in this browser's localStorage only:
 * it is per-device and per-origin, and is not synced to a server.
 */
export type PersistedWorkspaceState = SeedState;

/**
 * Older snapshots (v1, pre-roles) can't be upgraded safely - their data model
 * had no roles, project keys or block depth - so they fall back to fresh seed data.
 */
export function migratePersistedState(
  persisted: unknown,
  version: number
): PersistedWorkspaceState {
  if (version === STORE_VERSION && isPersistedState(persisted)) return persisted;
  return createSeedState();
}

function isPersistedState(value: unknown): value is PersistedWorkspaceState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.users) &&
    Array.isArray(v.workspaces) &&
    Array.isArray(v.projects) &&
    Array.isArray(v.pages) &&
    Array.isArray(v.issues) &&
    Array.isArray(v.activity)
  );
}

/** Storage that tolerates quota errors and private mode instead of throwing. */
export function createSafeStorage<S>(): PersistStorage<S> | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    getItem: (name) => {
      try {
        const raw = window.localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        console.warn("[forge] could not persist workspace to localStorage", error);
      }
    },
    removeItem: (name) => {
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

export function clearPersistedState(): void {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
