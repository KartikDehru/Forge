"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { IssueStatus } from "@/types";
import type { DomainError } from "@/domain/result";

export type ToastTone = "error" | "success" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface CreateIssueDraft {
  projectId?: string;
  status?: IssueStatus;
}

interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  createIssue: { open: boolean; draft: CreateIssueDraft };
  createPage: { open: boolean; projectId?: string };
  shortcutsOpen: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openCreateIssue: (draft?: CreateIssueDraft) => void;
  closeCreateIssue: () => void;
  openCreatePage: (projectId?: string) => void;
  closeCreatePage: () => void;
  setShortcutsOpen: (open: boolean) => void;
  toast: (tone: ToastTone, message: string) => void;
  toastError: (error: DomainError) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  createIssue: { open: false, draft: {} },
  createPage: { open: false },
  shortcutsOpen: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openCreateIssue: (draft = {}) => set({ createIssue: { open: true, draft } }),
  closeCreateIssue: () => set({ createIssue: { open: false, draft: {} } }),
  openCreatePage: (projectId) => set({ createPage: { open: true, projectId } }),
  closeCreatePage: () => set({ createPage: { open: false } }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toast: (tone, message) =>
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id: nanoid(6), tone, message }],
    })),
  toastError: (error) =>
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id: nanoid(6), tone: "error", message: error.message }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
