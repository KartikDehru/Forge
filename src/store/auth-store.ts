"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Session } from "@/types";
import { SESSION_KEY } from "@/lib/constants";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthState {
  session: Session | null;
  /** True once the stored session has been read on the client. */
  ready: boolean;
  init: () => void;
  login: (userId: string) => Session;
  logout: () => void;
}

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.userId || Date.now() > session.expiresAt) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: false,
  init: () => set({ session: readSession(), ready: true }),
  login: (userId) => {
    const session: Session = {
      userId,
      token: nanoid(24),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* session simply won't survive a reload */
    }
    set({ session, ready: true });
    return session;
  },
  logout: () => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    set({ session: null });
  },
}));
