"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type VisitReason = {
  id: string;
  label: string;
  slug: string;
  featured: boolean;
  category?: "EVENT" | "VISIT" | "OTHER" | null;
};

type VisitorSuggestion = {
  fullName: string;
  email: string;
};

type FormState = {
  fullName: string;
  email: string;
  photoDataUrl: string | null;
  visitReasonId: string;
  customReason: string;
};

const initialFormState: FormState = {
  fullName: "",
  email: "",
  photoDataUrl: null,
  visitReasonId: "",
  customReason: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPhotoUrl, setSubmittedPhotoUrl] = useState<string | null>(
    null
  );
  // Tracks the email of a visitor selected from the autocomplete dropdown.
  // null = fresh entry (no selection made or email was changed).
  const [selectedVisitorEmail, setSelectedVisitorEmail] = useState<
    string | null
  >(null);
  const [visitType, setVisitType] = useState<"event" | "visit" | null>(null);

  // Track initial mount so step 1 renders visible without waiting for JS
  const isInitialMount = useRef(true);
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

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

  // Load reasons on mount
  useEffect(() => {
    loadReasons();
  }, []);

  function handleReset() {
    setForm(initialFormState);
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmittedPhotoUrl(null);
    setSelectedVisitorEmail(null);
    setVisitType(null);
    setStep(1);
    // Re-fetch reasons so newly promoted custom reasons appear for the next visitor
    loadReasons();
  }

  /** Called when the user selects a past visitor from the name autocomplete. */
  function handleVisitorSelect(visitor: VisitorSuggestion) {
    setForm((prev) => ({
      ...prev,
      fullName: visitor.fullName,
      email: visitor.email,
    }));
    setSelectedVisitorEmail(visitor.email);
  }

  useEffect(() => {
    if (step === 7) {
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

  const firstName = useMemo(() => {
    const parts = form.fullName.trim().split(/\s+/);
    return parts[0] ?? "";
  }, [form.fullName]);

  const eventReasons = useMemo(
    () => reasons.filter((r) => r.category === "EVENT"),
    [reasons]
  );

  // When entering step 6 (event path) with exactly one featured event, auto-select and pre-fill
  useEffect(() => {
    if (step !== 6 || visitType !== "event" || eventReasons.length !== 1) return;
    const single = eventReasons[0];
    if (!single.featured) return;
    setForm((prev) => ({
      ...prev,
      visitReasonId: single.id,
      customReason: single.label,
    }));
  }, [step, visitType, eventReasons]);

  async function handleSubmit(override?: { customReason?: string; visitReasonId?: string | null }) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const customReason = override?.customReason ?? form.customReason;
      const visitReasonId = override?.visitReasonId !== undefined ? override.visitReasonId : form.visitReasonId;

      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        photoDataUrl: form.photoDataUrl,
        source: "KIOSK",
      };

      // Send either a predefined reason, a custom reason, or neither (skip)
      if (visitReasonId) {
        payload.visitReasonId = visitReasonId;
      } else if (customReason?.trim()) {
        payload.customReason = customReason.trim();
      }

      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setStep(7);
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
        {step < 7 && (
          <nav
            className="flex justify-center gap-2 py-3"
            aria-label="Check-in progress"
          >
            {[1, 2, 3, 4, 5, 6].map((s) => (
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

        {/* Spacer for step 7 to keep layout consistent */}
        {step === 7 && <div className="py-3" />}

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
                onVisitorSelect={handleVisitorSelect}
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
                prefillEmail={selectedVisitorEmail}
                onEmailDeviation={() => setSelectedVisitorEmail(null)}
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
              key="choice"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <ChoiceScreen
                onAttendingEvent={() => {
                  setVisitType("event");
                  setStep(6);
                }}
                onVisitingSomeone={() => {
                  setVisitType("visit");
                  setStep(6);
                }}
                onBack={() => setStep(4)}
              />
            </motion.div>
          )}

          {step === 6 && visitType === "event" && (
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
                reasons={eventReasons}
                selectedId={form.visitReasonId}
                customReason={form.customReason}
                onSelect={(visitReasonId) =>
                  setForm((prev) => ({
                    ...prev,
                    visitReasonId,
                    customReason: "",
                  }))
                }
                onCustomReasonChange={(customReason) =>
                  setForm((prev) => ({
                    ...prev,
                    customReason,
                    visitReasonId: "",
                  }))
                }
                onBack={() => {
                  setVisitType(null);
                  setStep(5);
                }}
                onSubmit={handleSubmit}
                onSkip={handleSubmit}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            </motion.div>
          )}

          {step === 6 && visitType === "visit" && (
            <motion.div
              key="visiting"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="flex flex-1 flex-col"
            >
              <VisitingSomeoneScreen
                onBack={() => {
                  setVisitType(null);
                  setStep(5);
                }}
                onSubmit={(personName) => {
                  const customReason = personName.trim() ? `Visiting ${personName.trim()}` : "";
                  handleSubmit({ visitReasonId: null, customReason });
                }}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          )}

          {step === 7 && (
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
  onVisitorSelect,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onVisitorSelect: (visitor: VisitorSuggestion) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const trimmed = value.trim();
  const canContinue = trimmed.length > 1;

  const [suggestions, setSuggestions] = useState<VisitorSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Debounced search against the visitor API
  const searchVisitors = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/visitors/search?q=${encodeURIComponent(q)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as VisitorSuggestion[];
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setHighlightIdx(-1);
      } catch {
        // Silently ignore – the user can still type freely
      }
    }, 300);
  }, []);

  function handleInputChange(newValue: string) {
    onChange(newValue);
    searchVisitors(newValue);
  }

  function handleSelect(visitor: VisitorSuggestion) {
    onVisitorSelect(visitor);
    setSuggestions([]);
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleBlur() {
    // Small delay so click on dropdown item can register before hiding
    blurTimeoutRef.current = setTimeout(() => setShowDropdown(false), 200);
  }

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (suggestions.length > 0 && value.trim().length >= 3) {
      setShowDropdown(true);
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

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

      <div className="relative mb-10" ref={wrapperRef}>
        <label className="block text-sm font-medium text-muted">
          Full name
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            autoComplete="off"
            className="mt-3 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3.5 text-base text-text outline-none transition-all duration-200 placeholder:text-subtle"
            placeholder="Alex Smith"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls="name-suggestions"
          />
        </label>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showDropdown && suggestions.length > 0 && (
            <motion.ul
              id="name-suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-edge bg-surface p-1 shadow-lg backdrop-blur-md"
            >
              {suggestions.map((visitor, idx) => (
                <li key={`${visitor.fullName}-${visitor.email}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent the input blur from firing before select
                      e.preventDefault();
                      handleSelect(visitor);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`flex w-full flex-col items-start rounded-xl px-4 py-2.5 text-left transition-colors ${
                      idx === highlightIdx
                        ? "bg-primary/15 text-text"
                        : "text-text hover:bg-surface-hover"
                    }`}
                    role="option"
                    aria-selected={idx === highlightIdx}
                  >
                    <span className="text-sm font-medium">
                      {visitor.fullName}
                    </span>
                    <span className="text-xs text-muted">{visitor.email}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canContinue={canContinue} />
    </section>
  );
}

function EmailScreen({
  value,
  onChange,
  prefillEmail,
  onEmailDeviation,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  prefillEmail: string | null;
  onEmailDeviation: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const trimmed = value.trim();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  // Track whether we've already fired the deviation callback
  const deviationFiredRef = useRef(false);

  // Reset the flag when prefillEmail changes (e.g. user went back and picked a
  // different suggestion)
  useEffect(() => {
    deviationFiredRef.current = false;
  }, [prefillEmail]);

  function handleChange(newEmail: string) {
    onChange(newEmail);

    // If the email was pre-filled from an autocomplete selection and the user
    // changes it, treat this as a fresh entry.
    if (
      prefillEmail !== null &&
      !deviationFiredRef.current &&
      newEmail !== prefillEmail
    ) {
      deviationFiredRef.current = true;
      onEmailDeviation();
    }
  }

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
            onChange={(e) => handleChange(e.target.value)}
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

  function stopStream() {
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

const EVENT_ILLUSTRATION_URL =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=480&q=80";
const VISIT_ILLUSTRATION_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=480&q=80";

function ChoiceScreen({
  onAttendingEvent,
  onVisitingSomeone,
  onBack,
}: {
  onAttendingEvent: () => void;
  onVisitingSomeone: () => void;
  onBack: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What brings you in today?
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Choose the option that best fits your visit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <motion.button
          type="button"
          onClick={onAttendingEvent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex flex-col overflow-hidden rounded-2xl border-2 border-edge bg-base-dark/60 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            <img
              src={EVENT_ILLUSTRATION_URL}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-dark/80 via-transparent to-transparent opacity-60" />
          </div>
          <div className="flex flex-1 flex-col justify-center px-5 py-4">
            <span className="text-lg font-semibold text-text">
              Attending an event
            </span>
            <span className="mt-1 block text-sm text-muted">
              Conference, workshop, or gathering
            </span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={onVisitingSomeone}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex flex-col overflow-hidden rounded-2xl border-2 border-edge bg-base-dark/60 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            <img
              src={VISIT_ILLUSTRATION_URL}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-dark/80 via-transparent to-transparent opacity-60" />
          </div>
          <div className="flex flex-1 flex-col justify-center px-5 py-4">
            <span className="text-lg font-semibold text-text">
              Visiting someone
            </span>
            <span className="mt-1 block text-sm text-muted">
              Meeting a person or team
            </span>
          </div>
        </motion.button>
      </div>

      <div className="mt-auto flex items-center pt-8">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          className="text-sm text-muted transition-colors hover:text-text"
        >
          &larr; Back
        </motion.button>
      </div>
    </section>
  );
}

function VisitingSomeoneScreen({
  onBack,
  onSubmit,
  isSubmitting,
}: {
  onBack: () => void;
  onSubmit: (personName: string) => void;
  isSubmitting: boolean;
}) {
  const [personName, setPersonName] = useState("");

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Who are you visiting?
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Enter the name of the person or team you&apos;re here to see.
        </p>
      </header>

      <div className="mb-6">
        <label className="block text-sm font-medium text-muted">
          Name
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Jane Smith, Product team"
            autoFocus
            className="mt-2 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3.5 text-base text-text outline-none transition-all duration-200 placeholder:text-subtle focus:border-primary/50"
          />
        </label>
      </div>

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
          onClick={() => onSubmit(personName)}
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium text-white btn-glow transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isSubmitting ? "Finishing up…" : "Finish check-in"}
        </motion.button>
      </div>
    </section>
  );
}

/* ── Reason icon map (slug → inline SVG) ─── */

const reasonIcons: Record<string, React.ReactNode> = {
  "meeting-someone": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="18" cy="9" r="2.5" /><path d="M21 21v-1.5a3 3 0 0 0-3-3h-.5" />
    </svg>
  ),
  coworking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10" /><path d="M12 16v4" />
    </svg>
  ),
  "attending-an-event": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M10 14h4" />
    </svg>
  ),
  "touring-the-space": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" /><path d="M16.24 7.76l-4.95 2.83-2.83 4.95 4.95-2.83z" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="2" y="7" width="15" height="13" rx="1.5" /><path d="M17 11h3l2 3v5h-5" /><circle cx="7.5" cy="20" r="1.5" /><circle cx="18.5" cy="20" r="1.5" />
    </svg>
  ),
  interview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="2" width="18" height="20" rx="2" /><path d="M8 7h8" /><path d="M8 11h5" /><circle cx="12" cy="16.5" r="1" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
};

const fallbackIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

function getReasonIcon(slug: string): React.ReactNode {
  return reasonIcons[slug] ?? fallbackIcon;
}

function ReasonScreen({
  reasons,
  selectedId,
  customReason,
  onSelect,
  onCustomReasonChange,
  onBack,
  onSubmit,
  onSkip,
  isSubmitting,
  submitError,
}: {
  reasons: VisitReason[];
  selectedId: string;
  customReason: string;
  onSelect: (id: string) => void;
  onCustomReasonChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const featured = useMemo(
    () => reasons.filter((r) => r.featured),
    [reasons]
  );
  const common = useMemo(
    () => reasons.filter((r) => !r.featured),
    [reasons]
  );

  const hasSelection = !!selectedId || customReason.trim().length > 0;
  const canSubmit = hasSelection && !isSubmitting;

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Why are you visiting today?
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Pick a reason, type your own, or skip if you&apos;d rather not say.
        </p>
      </header>

      {/* A – Featured reasons (prominent cards) */}
      {featured.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Happening now
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {featured.map((reason, index) => {
              const isSelected = reason.id === selectedId;
              return (
                <motion.button
                  key={reason.id}
                  type="button"
                  onClick={() => onSelect(reason.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.25 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative overflow-hidden rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/15 text-text"
                      : "border-accent/30 bg-accent/5 text-text hover:border-accent/50 hover:bg-accent/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-accent">
                      {getReasonIcon(reason.slug)}
                    </span>
                    <span className="text-sm font-semibold leading-snug">
                      {reason.label}
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="featured-check"
                      className="absolute right-3 top-3 text-xs font-medium text-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      &#10003;
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* B – Common reasons (icon grid) */}
      {common.length > 0 && (
        <div className="mb-4">
          {featured.length > 0 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Or choose a reason
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {common.map((reason, index) => {
              const isSelected = reason.id === selectedId;
              return (
                <motion.button
                  key={reason.id}
                  type="button"
                  onClick={() => onSelect(reason.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.25 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-white"
                      : "glass-card text-text hover:bg-surface-hover"
                  }`}
                >
                  <span className={isSelected ? "text-white" : "text-muted"}>
                    {getReasonIcon(reason.slug)}
                  </span>
                  <span className="leading-tight">{reason.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* C – Custom reason input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-muted">
          Or type your own reason
          <input
            type="text"
            value={customReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            placeholder="e.g. Picking up equipment, attending a workshop..."
            className="mt-2 w-full rounded-2xl border border-edge bg-base-dark/60 px-4 py-3 text-sm text-text outline-none transition-all duration-200 placeholder:text-subtle"
          />
        </label>
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

      {/* D – Navigation */}
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

        <div className="flex items-center gap-4">
          <motion.button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="text-sm text-subtle transition-colors hover:text-muted disabled:opacity-30"
          >
            Skip
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
