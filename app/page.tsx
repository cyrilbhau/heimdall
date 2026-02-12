"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center text-text">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10 text-center sm:px-12"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-4 text-5xl font-semibold tracking-tight sm:text-6xl"
        >
          <span className="gradient-text">Visitor kiosk</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-10 max-w-lg text-sm text-muted sm:text-base"
        >
          This is the admin entry point. The actual check-in flow lives at{" "}
          <code className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-accent-light font-mono">
            /kiosk
          </code>{" "}
          and the lightweight dashboard at{" "}
          <code className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-accent-light font-mono">
            /admin
          </code>
          .
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
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
        </motion.div>
      </motion.main>
    </div>
  );
}
