"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      setIsLoggingIn(false);
      setIsAuthed(true);
    } catch (error) {
      console.error("Login failed", error);
      setLoginError("Login failed. Please try again.");
      setIsLoggingIn(false);
    }
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text">
        <main className="glass-card w-full max-w-sm rounded-2xl px-6 py-8 animate-fade-in-up">
          <h1 className="mb-2 text-xl font-semibold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mb-6 text-xs text-muted">
            Enter the shared admin password to manage visit reasons and view
            recent visits.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-medium text-muted">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-edge bg-base-dark/60 px-3 py-2.5 text-sm text-text outline-none transition-all duration-200 placeholder:text-subtle"
              />
            </label>
            <AnimatePresence>
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-error"
                >
                  {loginError}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              type="submit"
              disabled={!password || isLoggingIn}
              whileHover={
                password && !isLoggingIn ? { scale: 1.01 } : {}
              }
              whileTap={
                password && !isLoggingIn ? { scale: 0.98 } : {}
              }
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              {isLoggingIn ? "Signing in\u2026" : "Sign in"}
            </motion.button>
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
      setReasons((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
      );
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
      setReasons((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error(err);
      setError("Unable to update reason. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center text-text">
      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="gradient-text">Visitor dashboard</span>
            </h1>
            <p className="mt-1 text-xs text-muted">
              Manage reasons for visiting and keep an eye on who&apos;s been
              through the door.
            </p>
          </div>
        </header>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-xs text-error"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Visit reasons */}
          <section className="glass-card rounded-2xl px-5 py-5 sm:px-6 animate-fade-in-up [animation-delay:100ms]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">
                Visit reasons
              </h2>
              <span className="text-xs text-subtle">
                {reasons.length} configured
              </span>
            </div>

            <form onSubmit={handleCreateReason} className="mb-4 flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add a new reason\u2026"
                className="flex-1 rounded-xl border border-edge bg-base-dark/60 px-3 py-2 text-xs text-text outline-none transition-all duration-200 placeholder:text-subtle"
              />
              <motion.button
                type="submit"
                disabled={!newLabel.trim() || isSavingReason}
                whileHover={
                  newLabel.trim() && !isSavingReason ? { scale: 1.03 } : {}
                }
                whileTap={
                  newLabel.trim() && !isSavingReason ? { scale: 0.97 } : {}
                }
                className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
              >
                {isSavingReason ? "Saving\u2026" : "Add"}
              </motion.button>
            </form>

            <div className="glass-card max-h-72 space-y-1 overflow-y-auto rounded-xl p-1 text-xs">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-10 w-full" />
                  ))}
                </div>
              ) : reasons.length === 0 ? (
                <div className="px-3 py-6 text-center text-subtle">
                  No reasons yet. Add a few to get started.
                </div>
              ) : (
                reasons
                  .slice()
                  .sort(
                    (a, b) =>
                      a.sortOrder - b.sortOrder ||
                      a.label.localeCompare(b.label)
                  )
                  .map((reason, index) => (
                    <motion.div
                      key={reason.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.25 }}
                      className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <div>
                        <div className="font-medium text-text">
                          {reason.label}
                        </div>
                        <div className="text-[10px] text-subtle">
                          {reason.slug} &middot; {reason.source.toLowerCase()}
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => toggleReasonActive(reason)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                          reason.active
                            ? "bg-success/15 text-success"
                            : "bg-surface-hover text-muted"
                        }`}
                      >
                        {reason.active ? "Active" : "Hidden"}
                      </motion.button>
                    </motion.div>
                  ))
              )}
            </div>
          </section>

          {/* Recent visits */}
          <section className="glass-card rounded-2xl px-5 py-5 sm:px-6 animate-fade-in-up [animation-delay:200ms]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">
                Recent visits
              </h2>
              <span className="text-xs text-subtle">
                Last {visits.length || 0}
              </span>
            </div>
            <div className="glass-card max-h-72 overflow-y-auto rounded-xl text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-base/90 backdrop-blur-sm text-[10px] uppercase tracking-wide text-subtle">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Photo</th>
                    <th className="px-3 py-2.5 text-left">Name</th>
                    <th className="px-3 py-2.5 text-left">Email</th>
                    <th className="px-3 py-2.5 text-left">Reason</th>
                    <th className="px-3 py-2.5 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-3">
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton h-8 w-full" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : visits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-subtle"
                      >
                        No visits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit, index) => (
                      <motion.tr
                        key={visit.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                        className="border-t border-edge transition-colors hover:bg-surface-hover"
                      >
                        <td className="px-3 py-2.5">
                          {visit.photoUrl ? (
                            <img
                              src={visit.photoUrl}
                              alt={`${visit.fullName}'s photo`}
                              className="h-8 w-8 rounded-full object-cover border border-edge"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-surface">
                              <span className="text-[8px] text-subtle">
                                &mdash;
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-text">
                          {visit.fullName}
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {visit.email}
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          {visit.visitReasonLabel ?? "\u2014"}
                        </td>
                        <td className="px-3 py-2.5 text-subtle">
                          {formatRelative(visit.createdAt)}
                        </td>
                      </motion.tr>
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
