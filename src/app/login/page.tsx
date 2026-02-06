"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const demoUsers = useAuthStore((s) => s.demoUsers);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const choose = (userId: string) => {
    login(userId);
    router.push("/");
  };

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface via-surface to-indigo-950/40 p-6">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-zinc-100">Sign in to Collab</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mock auth — pick a demo user. Session is stored in localStorage.
        </p>
        <ul className="mt-6 space-y-2">
          {demoUsers.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => choose(u.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-surface-border px-3 py-3 text-left transition hover:border-accent/50 hover:bg-surface"
              >
                <Avatar name={u.name} color={u.avatarColor} />
                <div>
                  <p className="text-sm font-medium text-zinc-100">{u.name}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </div>
                <span className="ml-auto text-xs capitalize text-zinc-500">{u.role}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          className="mt-4 w-full"
          onClick={() => choose("u1")}
        >
          Continue as Alex (owner)
        </Button>
      </Card>
    </div>
  );
}