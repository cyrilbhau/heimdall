"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type VisitReason = {
  id: string;
  label: string;
  slug: string;
};

type FormState = {
  fullName: string;
  email: string;
  photoDataUrl: string | null;
  visitReasonId: string;
};

const initialFormState: FormState = {
  fullName: "",
  email: "",
  photoDataUrl: null,
  visitReasonId: "",
};

/* ── Animation variants (for step transitions after user interaction) ── */

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const stepTransition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

/* ── Main page ──────────────────────────────── */

export default function KioskPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [reasons, setReasons] = useState<VisitReason[]>([]);
  const [reasonQuery, setReasonQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPhotoUrl, setSubmittedPhotoUrl] = useState<string | null>(
    null
  );

  // Track initial mount so step 1 renders visible without waiting for JS
  const isInitialMount = useRef(true);
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    async function loadReasons() {
      try {
        const res = await fetch("/api/visit-reasons");
        if (!res.ok) return;
        const data = (await res.json()) as VisitReason[];
        setReasons(data);
      } catch (error) {
        console.error("Failed to load visit reasons", error);
      }
    }

    loadReasons();
  }, []);

  function handleReset() {
    setForm(initialFormState);
    setReasonQuery("");
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmittedPhotoUrl(null);
    setStep(1);
  }

  useEffect(() => {
    if (step === 6) {
      const timer = setTimeout(() => {
        handleReset();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Shift the gradient background blobs on every step change
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("gradient:shift"));
  }, [step]);

  const filteredReasons = useMemo(() => {
    const q = reasonQuery.trim().toLowerCase();
    if (!q) return reasons;
    return reasons.filter((r) => r.label.toLowerCase().includes(q));
  }, [reasons, reasonQuery]);

  const firstName = useMemo(() => {
    const parts = form.fullName.trim().split(/\s+/);
    return parts[0] ?? "";
  }, [form.fullName]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          photoDataUrl: form.photoDataUrl,
          visitReasonId: form.visitReasonId,
          source: "KIOSK",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          (data as { error?: string }).error ?? "Something went wrong."
        );
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setSubmittedPhotoUrl(data.photoUrl || null);
      setStep(6);
    } catch (error) {
      console.error("Submit failed", error);
      setSubmitError("Unable to submit right now. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-text">
      <main className="flex h-screen w-full max-w-4xl flex-col justify-between px-6 py-10 sm:px-12">
        {/* Progress indicator */}
        {step < 6 && (
          <nav
            className="flex justify-center gap-2 py-3"
            aria-label="Check-in progress"
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-500 ease-out ${
                  s === step
                    ? "w-8 bg-primary"
                    : s < step
                      ? "w-2 bg-primary/40"
                      : "w-2 bg-edge"
                }`}
              />
            ))}
          </nav>
        )}

        {/* Spacer for step 6 to keep layout consistent */}
        {step === 6 && <div className="py-3" />}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="welcome"
              variants={stepVariants}
              initial={isInitialMount.current ? false : "enter"}
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <WelcomeScreen onNext={() => setStep(2)} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="name"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <NameScreen
                value={form.fullName}
                onChange={(fullName) =>
                  setForm((prev) => ({ ...prev, fullName }))
                }
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="email"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <EmailScreen
                value={form.email}
                onChange={(email) => setForm((prev) => ({ ...prev, email }))}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="photo"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <PhotoScreen
                photoDataUrl={form.photoDataUrl}
                onPhotoChange={(photoDataUrl) =>
                  setForm((prev) => ({ ...prev, photoDataUrl }))
                }
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
              />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="reason"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <ReasonScreen
                reasons={filteredReasons}
                query={reasonQuery}
                onQueryChange={setReasonQuery}
                selectedId={form.visitReasonId}
                onSelect={(visitReasonId) =>
                  setForm((prev) => ({ ...prev, visitReasonId }))
                }
                onBack={() => setStep(4)}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="flex flex-1 flex-col"
            >
              <ConfirmationScreen
                firstName={firstName}
                photoUrl={submittedPhotoUrl}
                onRestart={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-6 flex items-center justify-between text-xs text-subtle">
          <div>Visitor check-in</div>
          <div>Data used for safety and occasional updates.</div>
        </footer>
      </main>
    </div>
  );
}

/* ── Step components ────────────────────────── */

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-5xl font-semibold tracking-tight sm:text-6xl animate-fade-in-up">
        <span className="gradient-text">Welcome in.</span>
      </h1>
      <p className="mb-10 max-w-md text-base text-muted sm:text-lg animate-fade-in-up [animation-delay:100ms]">
        Please take a moment to check in so we know who&apos;s in the space and
        can keep you in the loop about what&apos;s happening here.
      </p>
      <div className="animate-fade-in-up [animation-delay:200ms]">
        <motion.button
          type="button"
          onClick={onNext}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="rounded-full bg-primary px-10 py-3.5 text-base font-medium text-white btn-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          Start check-in
        </motion.button>
      </div>
    </section>
  );
}

function NameScreen({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const trimmed = value.trim();
  const canContinue = trimmed.length > 1;

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-10">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          First up, your name.
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          This helps us greet you properly and know who&apos;s in the space.
        </p>
      </header>

      <div className="mb-10">
        <label className="block text-sm font-medium text-muted">
          Full name
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3.5 text-base text-text outline-none transition-all duration-200 placeholder:text-subtle"
            placeholder="Alex Smith"
          />
        </label>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canContinue={canContinue} />
    </section>
  );
}

function EmailScreen({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const trimmed = value.trim();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-10">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          And your email.
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          We use this to share event details, updates, and the occasional
          thoughtful email. No spam, ever.
        </p>
      </header>

      <div className="mb-10">
        <label className="block text-sm font-medium text-muted">
          Email address
          <input
            autoFocus
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3.5 text-base text-text outline-none transition-all duration-200 placeholder:text-subtle"
            placeholder="you@example.com"
          />
        </label>
        <p className="mt-2 text-xs text-subtle">
          By continuing, you&apos;re okay with us emailing you about what&apos;s
          happening here.
        </p>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canContinue={isValid} />
    </section>
  );
}

function PhotoScreen({
  photoDataUrl,
  onPhotoChange,
  onBack,
  onNext,
}: {
  photoDataUrl: string | null;
  onPhotoChange: (dataUrl: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  type CameraStatus = "requesting" | "ready" | "denied" | "unavailable";

  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  const cancelledRef = useRef(false);

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      // If component unmounted while waiting for permission, stop the stream immediately
      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      stopStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Autoplay was blocked — stream is assigned but video won't play
          setStatus("denied");
          return;
        }
      }
      setStatus("ready");
    } catch (error) {
      console.error("Camera error", error);
      if (!cancelledRef.current) {
        setStatus("denied");
      }
    }
  }

  // Auto-request camera when the step mounts
  useEffect(() => {
    cancelledRef.current = false;
    void startCamera();
    return () => {
      cancelledRef.current = true;
      stopStream();
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;

    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsCapturing(true);
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onPhotoChange(dataUrl);
    setIsCapturing(false);
    stopStream();
  }

  function handleDiscard() {
    onPhotoChange(null);
    void startCamera();
    void startCamera();
  }

  const hasPhoto = !!photoDataUrl;
  const canContinue =
    hasPhoto || status === "denied" || status === "unavailable";

  const showVideo = (status === "ready" || status === "requesting") && !hasPhoto;

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Quick photo, if you&apos;re okay with it.
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          This helps our team recognise you and keep the space safe. You can skip
          this if the camera isn&apos;t available.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="glass-card relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
            {/* Video element always in DOM so ref is available for stream */}
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover ${showVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              muted
              playsInline
            />
            {hasPhoto && photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Captured visitor"
                className="relative h-full w-full object-cover"
              />
            ) : status === "requesting" ? (
              <div className="relative flex h-full items-center justify-center px-6 text-center text-sm text-subtle">
                Starting camera&hellip;
              </div>
            ) : status === "unavailable" ? (
              <div className="relative flex h-full items-center justify-center px-6 text-center text-sm text-subtle">
                This device doesn&apos;t support camera access here. You can
                continue without a photo.
              </div>
            ) : status === "denied" ? (
              <div className="relative flex h-full items-center justify-center px-6 text-center text-sm text-subtle">
                Camera access was blocked. You can continue without a photo, or
                enable it in your browser settings.
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-card flex w-full flex-1 flex-col justify-between rounded-2xl px-5 py-5 text-sm">
          <div>
            <p className="mb-2 font-medium text-text">
              What we do with your photo
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>Used only for internal check-in and safety.</li>
              <li>Never shared publicly.</li>
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <motion.button
              type="button"
              onClick={
                hasPhoto
                  ? handleDiscard
                  : status === "ready"
                    ? handleCapture
                    : undefined
              }
              disabled={
                status === "unavailable" ||
                status === "denied" ||
                status === "requesting" ||
                isCapturing
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              {hasPhoto
                ? "Discard photo"
                : status === "requesting"
                  ? "Starting camera\u2026"
                  : isCapturing
                    ? "Capturing\u2026"
                    : "Capture photo"}
            </motion.button>
            {hasPhoto && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-success"
              >
                Photo captured. You&apos;re set.
              </motion.p>
            )}
            {status === "denied" && !hasPhoto && (
              <p className="text-xs text-warning">
                Camera access was blocked. You can still continue without a
                photo.
              </p>
            )}
            {status === "unavailable" && !hasPhoto && (
              <p className="text-xs text-warning">
                Camera isn&apos;t available on this device. You can continue
                without a photo.
              </p>
            )}
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canContinue={canContinue} />
    </section>
  );
}

function ReasonScreen({
  reasons,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  onBack,
  onSubmit,
  isSubmitting,
  submitError,
}: {
  reasons: VisitReason[];
  query: string;
  onQueryChange: (value: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const canSubmit = !!selectedId && !isSubmitting;

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Why are you visiting today?
        </h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          This helps us understand how people are using the space and what to
          invite you to next time.
        </p>
      </header>

      <div className="mb-4">
        <label className="block text-sm font-medium text-muted">
          Choose a reason
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search for your reason here..."
            className="mt-3 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3 text-sm text-text outline-none transition-all duration-200 placeholder:text-subtle"
          />
        </label>
      </div>

      <div className="glass-card mb-4 max-h-64 space-y-1 overflow-y-auto rounded-2xl p-1">
        {reasons.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-subtle">
            No reasons configured yet. Please speak to a team member.
          </div>
        )}
        {reasons.map((reason, index) => {
          const isSelected = reason.id === selectedId;
          return (
            <motion.button
              key={reason.id}
              type="button"
              onClick={() => onSelect(reason.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : "text-text hover:bg-surface-hover"
              }`}
            >
              <span>{reason.label}</span>
              {isSelected && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-medium text-white/80"
                >
                  Selected
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {submitError && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-sm text-error"
        >
          {submitError}
        </motion.p>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          className="text-sm text-muted transition-colors hover:text-text"
        >
          &larr; Back
        </motion.button>
        <motion.button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.97 } : {}}
          className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
        >
          {isSubmitting ? "Finishing up\u2026" : "Finish check-in"}
        </motion.button>
      </div>
    </section>
  );
}

function ConfirmationScreen({
  firstName,
  photoUrl,
  onRestart,
}: {
  firstName: string;
  photoUrl: string | null;
  onRestart: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl animate-fade-in-up">
        <span className="gradient-text">
          You&apos;re all set{firstName ? `, ${firstName}` : ""}.
        </span>
      </h2>

      {photoUrl && (
        <div className="mb-6 animate-scale-in [animation-delay:100ms]">
          <div className="relative mx-auto h-32 w-32">
            <div
              className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-accent opacity-50 blur-md"
              style={{ animation: "glow-ring 3s ease-in-out infinite" }}
            />
            <img
              src={photoUrl}
              alt="Visitor check-in photo"
              className="relative h-32 w-32 rounded-full object-cover border-2 border-edge"
            />
          </div>
        </div>
      )}

      <p className="mb-8 max-w-md text-sm text-muted animate-fade-in-up [animation-delay:200ms]">
        Thanks for checking in. Make yourself at home. This screen will reset for
        the next visitor in a few seconds.
      </p>
      <div className="animate-fade-in-up [animation-delay:300ms]">
        <motion.button
          type="button"
          onClick={onRestart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-edge px-8 py-2.5 text-sm font-medium text-text transition-colors hover:border-edge-hover hover:bg-surface"
        >
          Back to start now
        </motion.button>
      </div>
    </section>
  );
}

/* ── Shared step navigation ─────────────────── */

function StepNav({
  onBack,
  onNext,
  canContinue,
  nextLabel = "Next",
}: {
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-between pt-4">
      <motion.button
        type="button"
        onClick={onBack}
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.97 }}
        className="text-sm text-muted transition-colors hover:text-text"
      >
        &larr; Back
      </motion.button>
      <motion.button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        whileHover={canContinue ? { scale: 1.02 } : {}}
        whileTap={canContinue ? { scale: 0.97 } : {}}
        className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
      >
        {nextLabel}
      </motion.button>
    </div>
  );
}
