"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ------------------------------------------------------------------ *
 * Per-blob movement ranges.                                          *
 * Larger blobs move less; smaller ones travel further — creates depth.*
 * `dur` is the transition duration in seconds; each blob finishes at *
 * a slightly different time so they don't arrive in lockstep.        *
 * ------------------------------------------------------------------ */

const BLOB_RANGES = [
  { tx: 12, ty: 12, s: 0.08, r: 5, dur: 1.6 }, // blob-1  55vmax
  { tx: 15, ty: 15, s: 0.10, r: 5, dur: 2.0 }, // blob-2  50vmax
  { tx: 18, ty: 18, s: 0.12, r: 5, dur: 1.8 }, // blob-3  42vmax
  { tx: 10, ty: 10, s: 0.07, r: 5, dur: 2.2 }, // blob-4  60vmax (largest → least movement)
  { tx: 20, ty: 20, s: 0.15, r: 5, dur: 1.7 }, // blob-5  36vmax (smallest → most movement)
];

/* Swing easing — slight overshoot before settling, like a pendulum */
const SWING_EASING = "cubic-bezier(0.34, 1.3, 0.64, 1)";

const IDENTITY = "translate(0%, 0%) scale(1) rotate(0deg)";

function rand(range: number) {
  return (Math.random() - 0.5) * 2 * range;
}

function randomTransform(i: number) {
  const b = BLOB_RANGES[i];
  const tx = rand(b.tx).toFixed(1);
  const ty = rand(b.ty).toFixed(1);
  const sc = (1 + rand(b.s)).toFixed(3);
  const ro = rand(b.r).toFixed(1);
  return `translate(${tx}%, ${ty}%) scale(${sc}) rotate(${ro}deg)`;
}

function generateAll() {
  return BLOB_RANGES.map((_, i) => randomTransform(i));
}

export function GradientBackground() {
  const pathname = usePathname();

  /* Start at identity so SSR and first client render match */
  const [transforms, setTransforms] = useState<string[]>(
    () => BLOB_RANGES.map(() => IDENTITY),
  );

  /* Whether CSS transitions should be active (false for the initial jump) */
  const [animated, setAnimated] = useState(false);
  const readyRef = useRef(false);

  /* On mount: jump to random positions instantly, then enable transitions */
  useEffect(() => {
    setTransforms(generateAll());

    // Wait two frames so the browser paints the instant position first,
    // then turn transitions on for all future moves.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        readyRef.current = true;
        setAnimated(true);
      });
    });
  }, []);

  /* On route change → new positions */
  useEffect(() => {
    if (readyRef.current) {
      setTransforms(generateAll());
    }
  }, [pathname]);

  /* Listen for custom "gradient:shift" events (e.g. kiosk step changes) */
  useEffect(() => {
    function handleShift() {
      if (readyRef.current) {
        setTransforms(generateAll());
      }
    }
    window.addEventListener("gradient:shift", handleShift);
    return () => window.removeEventListener("gradient:shift", handleShift);
  }, []);

  /* Respect prefers-reduced-motion */
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="stripe-gradient" aria-hidden="true">
      {transforms.map((t, i) => (
        <div
          key={i}
          className={`blob blob-${i + 1}`}
          style={{
            transform: t,
            transition:
              animated && !reducedMotion
                ? `transform ${BLOB_RANGES[i].dur}s ${SWING_EASING}`
                : "none",
          }}
        />
      ))}
    </div>
  );
}
