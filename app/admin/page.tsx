"use client";

import { useEffect, useState } from "react";
import { Brand } from "../components/brand";

type VisitReason = {
  id: string;
  label: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  source: "MANUAL" | "LUMA";
  category: "EVENT" | "VISIT" | "OTHER" | null;
  featured: boolean;
  featuredAt: string | null;
};

const CATEGORY_OPTIONS: { value: "" | "EVENT" | "VISIT" | "OTHER"; label: string }[] = [
  { value: "", label: "—" },
  { value: "EVENT", label: "Event" },
  { value: "VISIT", label: "Visit" },
  { value: "OTHER", label: "Other" },
];

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
      <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="border-b">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 pr-28 md:px-10 md:pr-32">
            <Brand sublabel="ConsciousHQ" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:inline">
              Admin
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="card w-full max-w-sm">
            <span className="section-label mb-4">Admin dashboard</span>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.02em]">
              Sign in
            </h1>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Enter the shared admin password to manage visit reasons and view
              recent visits.
            </p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)]"
                />
              </label>
              {loginError && (
                <p
                  className="text-xs"
                  style={{ color: "var(--danger)" }}
                >
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={!password || isLoggingIn}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-foreground)] transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoggingIn ? "Signing in\u2026" : "Sign in"}
              </button>
            </form>
          </div>
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
  const [newCategory, setNewCategory] = useState<"" | "EVENT" | "VISIT" | "OTHER">("");
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
        body: JSON.stringify({
          label: newLabel.trim(),
          ...(newCategory && { category: newCategory }),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create reason");
      }
      const created = (await res.json()) as VisitReason;
      setReasons((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
      );
      setNewLabel("");
      setNewCategory("");
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

  async function updateReasonCategory(
    reason: VisitReason,
    category: "EVENT" | "VISIT" | "OTHER" | null
  ) {
    try {
      const res = await fetch("/api/admin/visit-reasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reason.id, category }),
      });
      if (!res.ok) throw new Error("Failed to update reason");
      const updated = (await res.json()) as VisitReason;
      setReasons((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error(err);
      setError("Unable to update category.");
    }
  }

  async function toggleReasonFeatured(reason: VisitReason) {
    const nowFeatured = isFeaturedActive(reason);
    try {
      const res = await fetch("/api/admin/visit-reasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reason.id, featured: !nowFeatured }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to update reason"
        );
      }
      const updated = (await res.json()) as VisitReason;
      setReasons((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to update reason."
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b bg-[var(--card)]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 pr-28 md:px-10 md:pr-32">
          <Brand sublabel="Visitor dashboard" />
          <div className="hidden items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:flex">
            <span>{reasons.length} reasons</span>
            <span>{visits.length} visits</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 md:px-10">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label mb-3">Admin</span>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
              Visitor dashboard
            </h1>
            <p className="mt-2 max-w-[560px] text-sm text-[var(--muted-foreground)]">
              Manage reasons for visiting and keep an eye on who&apos;s been
              through the door.
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-8 rounded-sm border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--danger)",
              color: "var(--danger)",
              background:
                "color-mix(in srgb, var(--danger) 10%, var(--card))",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid gap-px border lg:grid-cols-2" style={{ background: "var(--border)" }}>
          {/* Visit reasons */}
          <section className="bg-[var(--card)] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="section-label mb-2">Visit reasons</span>
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.01em]">
                  Configure
                </h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {reasons.length} configured
              </span>
            </div>

            <form
              onSubmit={handleCreateReason}
              className="mb-6 flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add a new reason…"
                className="min-w-0 flex-1 rounded-sm border bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(
                    e.target.value as "" | "EVENT" | "VISIT" | "OTHER"
                  )
                }
                className="rounded-sm border bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]"
                title="Category (Event / Visit / Other)"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newLabel.trim() || isSavingReason}
                className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-foreground)] transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSavingReason ? "Saving\u2026" : "Add"}
              </button>
            </form>

            <div className="max-h-[420px] divide-y overflow-y-auto border">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-10 w-full" />
                  ))}
                </div>
              ) : reasons.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
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
                  .map((reason) => {
                    const isCurrentlyFeatured = isFeaturedActive(reason);
                    const featuredCount = reasons.filter(isFeaturedActive).length;
                    const canFeature =
                      reason.active &&
                      (isCurrentlyFeatured || featuredCount < 3);

                    return (
                      <div
                        key={reason.id}
                        className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-[var(--muted)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            {reason.label}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                            {reason.slug} · {reason.source.toLowerCase()}
                            {reason.category && (
                              <span
                                className="ml-1"
                                style={{ color: "var(--primary)" }}
                              >
                                · {reason.category.toLowerCase()}
                              </span>
                            )}
                            {isCurrentlyFeatured && (
                              <span
                                className="ml-1"
                                style={{ color: "var(--primary)" }}
                              >
                                · {featuredTimeLeft(reason)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            value={reason.category ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateReasonCategory(
                                reason,
                                v === "" ? null : (v as "EVENT" | "VISIT" | "OTHER")
                              );
                            }}
                            className="rounded-sm border bg-[var(--card)] px-2 py-1 text-[10px] text-[var(--foreground)]"
                            title="Category"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value || "none"} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {reason.active && (
                            <button
                              type="button"
                              onClick={() => toggleReasonFeatured(reason)}
                              disabled={!canFeature && !isCurrentlyFeatured}
                              title={
                                !canFeature && !isCurrentlyFeatured
                                  ? "Max 3 featured reasons"
                                  : isCurrentlyFeatured
                                    ? "Remove from featured"
                                    : "Feature this reason"
                              }
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                                isCurrentlyFeatured
                                  ? ""
                                  : canFeature
                                    ? "text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                                    : "cursor-not-allowed opacity-40"
                              }`}
                              style={
                                isCurrentlyFeatured
                                  ? {
                                      background: "var(--accent)",
                                      color: "var(--primary)",
                                    }
                                  : { background: "var(--muted)" }
                              }
                            >
                              {isCurrentlyFeatured ? "Featured" : "Feature"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleReasonActive(reason)}
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                            style={
                              reason.active
                                ? {
                                    background:
                                      "color-mix(in srgb, var(--success) 18%, var(--card))",
                                    color: "var(--success)",
                                  }
                                : {
                                    background: "var(--muted)",
                                    color: "var(--muted-foreground)",
                                  }
                            }
                          >
                            {reason.active ? "Active" : "Hidden"}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </section>

          {/* Recent visits */}
          <section className="bg-[var(--card)] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="section-label mb-2">Recent visits</span>
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.01em]">
                  Who&apos;s been by
                </h2>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Last {visits.length || 0}
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto border">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--muted)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Photo</th>
                    <th className="px-3 py-2.5 text-left">Name</th>
                    <th className="px-3 py-2.5 text-left">Email</th>
                    <th className="px-3 py-2.5 text-left">Reason</th>
                    <th className="px-3 py-2.5 text-left">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
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
                        className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]"
                      >
                        No visits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    visits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="transition-colors hover:bg-[var(--muted)]"
                      >
                        <td className="px-3 py-2.5">
                          {visit.photoUrl ? (
                            <img
                              src={visit.photoUrl}
                              alt={`${visit.fullName}'s photo`}
                              className="h-8 w-8 rounded-sm border object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-sm border bg-[var(--muted)]">
                              <span className="text-[8px] text-[var(--muted-foreground)]">
                                &mdash;
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-[var(--foreground)]">
                          {visit.fullName}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
                          {visit.email}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
                          {visit.visitReasonLabel ?? "\u2014"}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
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

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:px-10">
          <span>ConsciousHQ · Indiranagar</span>
          <span>Admin</span>
        </div>
      </footer>
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

const FEATURED_TTL_MS = 48 * 60 * 60 * 1000;

/** Is this reason currently featured (within the 48h window)? */
function isFeaturedActive(reason: VisitReason): boolean {
  if (!reason.featured || !reason.featuredAt) return false;
  return Date.now() - new Date(reason.featuredAt).getTime() < FEATURED_TTL_MS;
}

/** Human-readable remaining featured time, e.g. "23h left" or "45m left" */
function featuredTimeLeft(reason: VisitReason): string {
  if (!reason.featuredAt) return "";
  const elapsed = Date.now() - new Date(reason.featuredAt).getTime();
  const remainingMs = FEATURED_TTL_MS - elapsed;
  if (remainingMs <= 0) return "expired";
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
