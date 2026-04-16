"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brand } from "../components/brand";

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

/* ── Animation variants — subtle per guide ── */
const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

const stepTransition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

const STEP_LABELS: Record<number, string> = {
  1: "Welcome",
  2: "Name",
  3: "Email",
  4: "Photo",
  5: "Purpose",
  6: "Details",
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
  const [selectedVisitorEmail, setSelectedVisitorEmail] = useState<
    string | null
  >(null);
  const [visitType, setVisitType] = useState<"event" | "visit" | "coworking" | null>(null);

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
    loadReasons();
  }

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

  const firstName = useMemo(() => {
    const parts = form.fullName.trim().split(/\s+/);
    return parts[0] ?? "";
  }, [form.fullName]);

  const eventReasons = useMemo(
    () => reasons.filter((r) => r.category === "EVENT"),
    [reasons]
  );

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
      const visitReasonId =
        override?.visitReasonId !== undefined
          ? override.visitReasonId
          : form.visitReasonId;

      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        photoDataUrl: form.photoDataUrl,
        source: "KIOSK",
      };

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

  const stepLabel = STEP_LABELS[step] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-4 pr-28 md:px-10 md:pr-32">
          <Brand sublabel="ConsciousHQ" />
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:inline">
            Visitor check-in
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-6 py-8 md:px-10">
        {/* Progress indicator */}
        {step < 7 ? (
          <div className="mb-10">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <span>
                Step {String(step).padStart(2, "0")} / 06
              </span>
              <span>{stepLabel}</span>
            </div>
            <nav
              className="flex gap-1"
              aria-label="Check-in progress"
            >
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <span
                  key={s}
                  className="h-[2px] flex-1 transition-colors duration-300"
                  style={{
                    background:
                      s === step
                        ? "var(--primary)"
                        : s < step
                          ? "var(--foreground)"
                          : "var(--border)",
                  }}
                />
              ))}
            </nav>
          </div>
        ) : (
          <div className="mb-10" />
        )}

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
                onCoworking={() => {
                  setVisitType("coworking");
                  handleSubmit({
                    visitReasonId: null,
                    customReason: "Coworking",
                  });
                }}
                onBack={() => setStep(4)}
                isSubmitting={isSubmitting}
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
                  const customReason = personName.trim()
                    ? `Visiting ${personName.trim()}`
                    : "";
                  handleSubmit({ visitReasonId: null, customReason });
                }}
                isSubmitting={isSubmitting}
              />
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
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
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-5 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:px-10">
          <span>ConsciousHQ · Indiranagar</span>
          <span>Data used for safety and occasional updates</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Step components ────────────────────────── */

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <Brand size="lg" className="mb-10 justify-center" />
      <span className="section-label mb-8">Visitor check-in</span>
      <h1 className="font-[family-name:var(--font-heading)] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl md:text-7xl">
        Welcome <span style={{ color: "var(--primary)" }}>in</span>.
      </h1>
      <p className="mt-6 max-w-[520px] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
        Please take a moment to check in so we know who&apos;s in the space
        and can keep you in the loop about what&apos;s happening here.
      </p>
      <div className="mt-10">
        <PrimaryButton onClick={onNext}>Start check-in</PrimaryButton>
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
    blurTimeoutRef.current = setTimeout(() => setShowDropdown(false), 200);
  }

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (suggestions.length > 0 && value.trim().length >= 3) {
      setShowDropdown(true);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 02 · Name"
        title="First up, your name."
        description="This helps us greet you properly and know who’s in the space."
      />

      <div className="relative mb-10 max-w-[560px]" ref={wrapperRef}>
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Full name
          </span>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            autoComplete="off"
            className="w-full rounded-sm border bg-[var(--card)] px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            placeholder="Alex Smith"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls="name-suggestions"
          />
        </label>

        <AnimatePresence>
          {showDropdown && suggestions.length > 0 && (
            <motion.ul
              id="name-suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 z-20 mt-1 max-h-60 divide-y overflow-y-auto border bg-[var(--card)]"
            >
              {suggestions.map((visitor, idx) => (
                <li key={`${visitor.fullName}-${visitor.email}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(visitor);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`flex w-full flex-col items-start px-4 py-3 text-left transition-colors ${
                      idx === highlightIdx
                        ? "bg-[var(--muted)]"
                        : "hover:bg-[var(--muted)]"
                    }`}
                    role="option"
                    aria-selected={idx === highlightIdx}
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {visitor.fullName}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {visitor.email}
                    </span>
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

  const deviationFiredRef = useRef(false);

  useEffect(() => {
    deviationFiredRef.current = false;
  }, [prefillEmail]);

  function handleChange(newEmail: string) {
    onChange(newEmail);
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
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 03 · Email"
        title="And your email."
        description="We use this to share event details, updates, and the occasional thoughtful email. No spam, ever."
      />

      <div className="mb-10 max-w-[560px]">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Email address
          </span>
          <input
            autoFocus
            type="email"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full rounded-sm border bg-[var(--card)] px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            placeholder="you@example.com"
          />
        </label>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
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
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 04 · Photo"
        title="Quick photo, if you’re okay with it."
        description="This helps our team recognise you and keep the space safe. You can skip this if the camera isn’t available."
      />

      <div
        className="mb-8 grid grid-cols-1 gap-px border sm:grid-cols-[2fr_1fr]"
        style={{ background: "var(--border)" }}
      >
        <div className="bg-[var(--card)] p-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden border bg-[var(--muted)]">
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
              <div className="relative flex h-full items-center justify-center px-6 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Starting camera&hellip;
              </div>
            ) : status === "unavailable" ? (
              <div className="relative flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted-foreground)]">
                This device doesn&apos;t support camera access here. You can
                continue without a photo.
              </div>
            ) : status === "denied" ? (
              <div className="relative flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted-foreground)]">
                Camera access was blocked. You can continue without a photo, or
                enable it in your browser settings.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between bg-[var(--card)] p-5 text-sm">
          <div>
            <span className="section-label mb-3">Your photo</span>
            <p className="mb-2 font-medium text-[var(--foreground)]">
              What we do with it
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--muted-foreground)]">
              <li>Used only for internal check-in and safety.</li>
              <li>Never shared publicly.</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
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
              className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-foreground)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {hasPhoto
                ? "Discard photo"
                : status === "requesting"
                  ? "Starting camera\u2026"
                  : isCapturing
                    ? "Capturing\u2026"
                    : "Capture photo"}
            </button>
            {hasPhoto && (
              <p
                className="text-xs font-medium"
                style={{ color: "var(--success)" }}
              >
                Photo captured. You&apos;re set.
              </p>
            )}
            {status === "denied" && !hasPhoto && (
              <p
                className="text-xs"
                style={{ color: "var(--warning)" }}
              >
                Camera access was blocked. You can still continue without a
                photo.
              </p>
            )}
            {status === "unavailable" && !hasPhoto && (
              <p
                className="text-xs"
                style={{ color: "var(--warning)" }}
              >
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

function ChoiceScreen({
  onAttendingEvent,
  onVisitingSomeone,
  onCoworking,
  onBack,
  isSubmitting,
}: {
  onAttendingEvent: () => void;
  onVisitingSomeone: () => void;
  onCoworking: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 05 · Purpose"
        title="What brings you in today?"
        description="Choose the option that best fits your visit."
      />

      <div
        className="mb-8 grid grid-cols-1 gap-px border sm:grid-cols-3"
        style={{ background: "var(--border)" }}
      >
        <ChoiceTile
          index="01"
          title="Attending an event"
          description="Conference, workshop, or gathering"
          onClick={onAttendingEvent}
          disabled={isSubmitting}
        />
        <ChoiceTile
          index="02"
          title="Visiting someone"
          description="Meeting a person or team"
          onClick={onVisitingSomeone}
          disabled={isSubmitting}
        />
        <ChoiceTile
          index="03"
          title="Coworking"
          description="Heads-down work from the space"
          onClick={onCoworking}
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-auto flex items-center pt-4">
        <BackButton onClick={onBack} />
      </div>
    </section>
  );
}

function ChoiceTile({
  index,
  title,
  description,
  onClick,
  disabled,
}: {
  index: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex min-h-[220px] flex-col justify-between bg-[var(--card)] p-8 text-left transition-colors hover:bg-[var(--muted)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--card)] md:p-10"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
        style={{ background: "var(--primary)" }}
      />
      <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        {index}
      </span>
      <div className="mt-10">
        <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>
    </button>
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
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 06 · Details"
        title="Who are you visiting?"
        description="Enter the name of the person or team you’re here to see."
      />

      <div className="mb-10 max-w-[560px]">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Name
          </span>
          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Jane Smith, Product team"
            autoFocus
            className="w-full rounded-sm border bg-[var(--card)] px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
        </label>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <BackButton onClick={onBack} />
        <PrimaryButton
          onClick={() => onSubmit(personName)}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Finishing up…" : "Finish check-in"}
        </PrimaryButton>
      </div>
    </section>
  );
}

/* ── Reason icon map (slug → inline SVG) ─── */

const reasonIcons: Record<string, React.ReactNode> = {
  "meeting-someone": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="18" cy="9" r="2.5" /><path d="M21 21v-1.5a3 3 0 0 0-3-3h-.5" />
    </svg>
  ),
  coworking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10" /><path d="M12 16v4" />
    </svg>
  ),
  "attending-an-event": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M10 14h4" />
    </svg>
  ),
  "touring-the-space": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" /><path d="M16.24 7.76l-4.95 2.83-2.83 4.95 4.95-2.83z" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="7" width="15" height="13" rx="1.5" /><path d="M17 11h3l2 3v5h-5" /><circle cx="7.5" cy="20" r="1.5" /><circle cx="18.5" cy="20" r="1.5" />
    </svg>
  ),
  interview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="2" width="18" height="20" rx="2" /><path d="M8 7h8" /><path d="M8 11h5" /><circle cx="12" cy="16.5" r="1" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
};

const fallbackIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
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
    <section className="flex flex-1 flex-col">
      <StepHeader
        label="Step 06 · Details"
        title="Why are you visiting today?"
        description="Pick a reason, type your own, or skip if you’d rather not say."
      />

      {/* A – Featured reasons */}
      {featured.length > 0 && (
        <div className="mb-6">
          <span className="section-label mb-3">Happening now</span>
          <div
            className="grid grid-cols-1 gap-px border sm:grid-cols-3"
            style={{ background: "var(--border)" }}
          >
            {featured.map((reason) => {
              const isSelected = reason.id === selectedId;
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => onSelect(reason.id)}
                  className={`relative flex items-start gap-3 p-5 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--card)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 top-0 h-[2px]"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                  <span
                    className={
                      isSelected ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                    }
                  >
                    {getReasonIcon(reason.slug)}
                  </span>
                  <span className="text-sm font-semibold leading-snug text-[var(--foreground)]">
                    {reason.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* B – Common reasons */}
      {common.length > 0 && (
        <div className="mb-6">
          {featured.length > 0 && (
            <span className="section-label mb-3">Or choose a reason</span>
          )}
          <div
            className="grid grid-cols-2 gap-px border sm:grid-cols-3 lg:grid-cols-4"
            style={{ background: "var(--border)" }}
          >
            {common.map((reason) => {
              const isSelected = reason.id === selectedId;
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => onSelect(reason.id)}
                  className={`flex flex-col items-start gap-3 p-4 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--card)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <span
                    className={
                      isSelected
                        ? "text-[var(--primary)]"
                        : "text-[var(--muted-foreground)]"
                    }
                  >
                    {getReasonIcon(reason.slug)}
                  </span>
                  <span className="text-xs font-semibold leading-tight text-[var(--foreground)]">
                    {reason.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* C – Custom reason */}
      <div className="mb-4 max-w-[560px]">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Or type your own reason
          </span>
          <input
            type="text"
            value={customReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            placeholder="e.g. Picking up equipment, attending a workshop..."
            className="w-full rounded-sm border bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
        </label>
      </div>

      {submitError && (
        <p
          className="mb-3 text-sm"
          style={{ color: "var(--danger)" }}
        >
          {submitError}
        </p>
      )}

      {/* D – Navigation */}
      <div className="mt-auto flex items-center justify-between pt-6">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
          >
            Skip
          </button>
          <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Finishing up\u2026" : "Finish check-in"}
          </PrimaryButton>
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
    <section className="flex flex-1 items-center justify-center">
      <div className="grid-texture w-full p-6 md:p-10">
        <div className="section-frame mx-auto max-w-[720px]">
          <div className="flex flex-col items-center text-center">
            <span className="section-label mb-6">Checked in</span>

            <h2 className="font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
              You&apos;re all set
              {firstName ? (
                <>
                  ,{" "}
                  <span style={{ color: "var(--primary)" }}>
                    {firstName}
                  </span>
                </>
              ) : (
                ""
              )}
              .
            </h2>

            {photoUrl && (
              <div className="mt-8 border p-1">
                <img
                  src={photoUrl}
                  alt="Visitor check-in photo"
                  className="h-32 w-32 object-cover"
                />
              </div>
            )}

            <p className="mt-6 max-w-[420px] text-sm leading-relaxed text-[var(--muted-foreground)]">
              Thanks for checking in. Make yourself at home. This screen will
              reset for the next visitor in a few seconds.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center justify-center rounded-sm border bg-[var(--card)] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                Back to start now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Shared primitives ────────────────────── */

function StepHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-10 max-w-[760px]">
      <span className="section-label mb-4">{label}</span>
      <h2 className="font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 max-w-[560px] text-base text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
    </header>
  );
}

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
    <div className="mt-auto flex items-center justify-between pt-6">
      <BackButton onClick={onBack} />
      <PrimaryButton onClick={onNext} disabled={!canContinue}>
        {nextLabel}
      </PrimaryButton>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-8 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary-foreground)] transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      ← Back
    </button>
  );
}
