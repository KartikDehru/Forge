import { SESSION_KEY } from "@/lib/constants";
import type { Session, User } from "@/types";
import { SAMPLE_USERS } from "@/lib/sample-data";
import { nanoid } from "nanoid";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  const session = getStoredSession();
  if (!session) return null;
  return SAMPLE_USERS.find((u) => u.id === session.userId) ?? null;
}

export function loginAsUser(userId: string): Session {
  const user = SAMPLE_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error("Unknown user");
  }
  const session: Session = {
    userId,
    token: nanoid(24),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  if (isBrowser()) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function logout(): void {
  if (isBrowser()) {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function listDemoUsers(): User[] {
  return SAMPLE_USERS;
}