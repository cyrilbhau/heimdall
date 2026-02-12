"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center text-text">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10 text-center sm:px-12">
        <h1 className="mb-4 text-5xl font-semibold tracking-tight sm:text-6xl animate-fade-in-up">
          <span className="gradient-text">Visitor kiosk</span>
        </h1>
        <p className="mb-10 max-w-lg text-sm text-muted sm:text-base animate-fade-in-up [animation-delay:150ms]">
          This is the admin entry point. The actual check-in flow lives at{" "}
          <code className="rounded-md bg-base-dark px-1.5 py-0.5 text-xs text-primary font-mono">
            /kiosk
          </code>{" "}
          and the lightweight dashboard at{" "}
          <code className="rounded-md bg-base-dark px-1.5 py-0.5 text-xs text-primary font-mono">
            /admin
          </code>
          .
        </p>
        <div className="flex flex-col gap-4 sm:flex-row animate-fade-in-up [animation-delay:300ms]">
          <motion.a
            href="/kiosk"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="rounded-full bg-primary px-10 py-3 text-sm font-medium text-white btn-glow"
          >
            Open kiosk
          </motion.a>
          <motion.a
            href="/admin"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="rounded-full border border-edge px-10 py-3 text-sm font-medium text-text transition-colors hover:border-edge-hover hover:bg-surface"
          >
            Open admin
          </motion.a>
        </div>
      </main>
    </div>
  );
}
