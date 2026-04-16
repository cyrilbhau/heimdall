"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  if (!mounted) {
    return (
      <div
        className="fixed right-4 top-4 z-50 h-7 w-[68px]"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-4 top-4 z-50 inline-flex h-7 items-center gap-1.5 rounded-sm border bg-[var(--card)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5"
        style={{ background: "var(--primary)" }}
      />
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
