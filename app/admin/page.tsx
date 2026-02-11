"use client";

import { useEffect, useState } from "react";

type VisitReason = {
  id: string;
  label: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  source: "MANUAL" | "LUMA";
};

type VisitSummary = {
  id: string;
  fullName: string;
  email: string;
  visitReasonLabel: string | null;
  source: string;
  createdAt: string;
  photoUrl: string | null;
};

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError((data as { error?: string }).error ?? "Login failed");
        setIsLoggingIn(false);
        return;
      }
      setIsAuthed(true);
    } catch (error) {
      console.error("Login failed", error);
      setLoginError("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-50">
        <main className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-8 shadow-2xl">
          <h1 className="mb-2 text-xl font-semibold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mb-6 text-xs text-zinc-400">
            Enter the shared admin password to manage visit reasons and view recent visits.
          </p>
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <label className="block text-xs font-medium text-zinc-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-400"
              />
            </label>
            {loginError && (
              <p className="text-xs text-rose-400">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={!password || isLoggingIn}
              className="w-full rounded-full bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {isLoggingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [reasons, setReasons] = useState<VisitReason[]>([]);
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [isSavingReason, setIsSavingReason] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [reasonsRes, visitsRes] = await Promise.all([
          fetch("/api/admin/visit-reasons"),
          fetch("/api/admin/visits"),
        ]);
        if (!reasonsRes.ok || !visitsRes.ok) {
          throw new Error("Failed to load admin data");
        }
        const reasonsData = (await reasonsRes.json()) as VisitReason[];
        const visitsData = (await visitsRes.json()) as VisitSummary[];
        setReasons(reasonsData);
        setVisits(visitsData);
      } catch (err) {
        console.error(err);
        setError("Unable to load admin data. Refresh to try again.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleCreateReason(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setIsSavingReason(true);
    try {
      const res = await fetch("/api/admin/visit-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!res.ok) {
        throw new Error("Failed to create reason");
      }
      const created = (await res.json()) as VisitReason;
      setReasons((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewLabel("");
    } catch (err) {
      console.error(err);
      setError("Unable to create reason. Please try again.");
    } finally {
      setIsSavingReason(false);
    }
  }

  async function toggleReasonActive(reason: VisitReason) {
    try {
      const res = await fetch("/api/admin/visit-reasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reason.id, active: !reason.active }),
      });
      if (!res.ok) {
        throw new Error("Failed to update reason");
      }
      const updated = (await res.json()) as VisitReason;
      setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error(err);
      setError("Unable to update reason. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-900 text-zinc-50">
      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Visitor dashboard
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Manage reasons for visiting and keep an eye on who&apos;s been through the
              door.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-700/60 bg-rose-950/40 px-4 py-3 text-xs text-rose-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Visit reasons</h2>
              <span className="text-xs text-zinc-500">
                {reasons.length} configured
              </span>
            </div>

            <form
              onSubmit={handleCreateReason}
              className="mb-4 flex gap-2"
            >
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add a new reason…"
                className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-50 outline-none ring-0 transition focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={!newLabel.trim() || isSavingReason}
                className="rounded-full bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-900 shadow-sm shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {isSavingReason ? "Saving…" : "Add"}
              </button>
            </form>

            <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1 text-xs">
              {loading ? (
                <div className="px-3 py-6 text-center text-zinc-500">
                  Loading reasons…
                </div>
              ) : reasons.length === 0 ? (
                <div className="px-3 py-6 text-center text-zinc-500">
                  No reasons yet. Add a few to get started.
                </div>
              ) : (
                reasons
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
                  .map((reason) => (
                    <div
                      key={reason.id}
                      className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-zinc-800"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">
                          {reason.label}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {reason.slug} · {reason.source.toLowerCase()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleReasonActive(reason)}
                        className={`rounded-full px-3 py-1 text-[10px] font-medium ${
                          reason.active
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        {reason.active ? "Active" : "Hidden"}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Recent visits</h2>
              <span className="text-xs text-zinc-500">
                Last {visits.length || 0}
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-zinc-900/90 text-[10px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Photo</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-zinc-500"
                      >
                        Loading visits…
                      </td>
                    </tr>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-zinc-500"
                      >
                        No visits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="border-t border-zinc-800/80"
                      >
                        <td className="px-3 py-2">
                          {visit.photoUrl ? (
                            <img
                              src={visit.photoUrl}
                              alt={`${visit.fullName}'s photo`}
                              className="h-8 w-8 rounded-full object-cover border border-zinc-700"
                              onError={(e) => {
                                // Hide image on error
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center">
                              <span className="text-[8px] text-zinc-400">No photo</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-zinc-100">
                          {visit.fullName}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">
                          {visit.email}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">
                          {visit.visitReasonLabel ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {formatRelative(visit.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

