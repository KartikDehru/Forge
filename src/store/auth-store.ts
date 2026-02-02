"use client";

import { create } from "zustand";
import type { User, Session } from "@/types";
import {
  getStoredSession,
  getCurrentUser,
  loginAsUser,
  logout as clearSession,
  listDemoUsers,
} from "@/lib/auth";

interface AuthState {
  session: Session | null;
  user: User | null;
  demoUsers: User[];
  init: () => void;
  login: (userId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  demoUsers: listDemoUsers(),
  init: () => {
    const session = getStoredSession();
    const user = getCurrentUser();
    set({ session, user });
  },
  login: (userId) => {
    const session = loginAsUser(userId);
    const user = listDemoUsers().find((u) => u.id === userId) ?? null;
    set({ session, user });
  },
  logout: () => {
    clearSession();
    set({ session: null, user: null });
  },
}));