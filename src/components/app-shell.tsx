"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { useSessionFlow } from "@/context/session-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, hasFirebase, loading, signIn, logout } = useAuth();
  const { session } = useSessionFlow();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Body Doubling MVP</h1>
            <p className="text-xs text-zinc-600">
              Stage: <span className="font-medium">{session.stage}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {loading ? (
              <span className="text-zinc-500">Loading auth...</span>
            ) : hasFirebase ? (
              user ? (
                <>
                  <span className="hidden text-zinc-600 sm:inline">
                    {user.isAnonymous
                      ? "Anonymous session"
                      : user.email ?? "Signed in"}
                  </span>
                  <button
                    className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100"
                    onClick={logout}
                    type="button"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700"
                  onClick={signIn}
                  type="button"
                >
                  Sign in anonymously
                </button>
              )
            ) : (
              <span className="text-amber-700">
                Firebase env vars missing; running local-only mode
              </span>
            )}
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-6 pb-4 text-sm">
          <Link className="rounded bg-zinc-100 px-2 py-1" href="/">
            Intake
          </Link>
          <Link className="rounded bg-zinc-100 px-2 py-1" href="/kickoff">
            Kickoff
          </Link>
          <Link className="rounded bg-zinc-100 px-2 py-1" href="/active">
            Active
          </Link>
          <Link className="rounded bg-zinc-100 px-2 py-1" href="/check-ins">
            Check-ins
          </Link>
          <Link className="rounded bg-zinc-100 px-2 py-1" href="/debrief">
            Debrief
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
