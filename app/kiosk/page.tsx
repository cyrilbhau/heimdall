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

export default function KioskPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [reasons, setReasons] = useState<VisitReason[]>([]);
  const [reasonQuery, setReasonQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPhotoUrl, setSubmittedPhotoUrl] = useState<string | null>(null);

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
        setSubmitError((data as { error?: string }).error ?? "Something went wrong.");
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-50">
      <main className="flex h-screen w-full max-w-4xl flex-col justify-between rounded-none bg-zinc-950 px-6 py-10 shadow-2xl sm:rounded-3xl sm:px-12">
        {step === 1 && <WelcomeScreen onNext={() => setStep(2)} />}

        {step === 2 && (
          <NameScreen
            value={form.fullName}
            onChange={(fullName) => setForm((prev) => ({ ...prev, fullName }))}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <EmailScreen
            value={form.email}
            onChange={(email) => setForm((prev) => ({ ...prev, email }))}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <PhotoScreen
            photoDataUrl={form.photoDataUrl}
            onPhotoChange={(photoDataUrl) =>
              setForm((prev) => ({
                ...prev,
                photoDataUrl,
              }))
            }
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <ReasonScreen
            reasons={filteredReasons}
            query={reasonQuery}
            onQueryChange={setReasonQuery}
            selectedId={form.visitReasonId}
            onSelect={(visitReasonId) =>
              setForm((prev) => ({
                ...prev,
                visitReasonId,
              }))
            }
            onBack={() => setStep(4)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}

        {step === 6 && (
          <ConfirmationScreen
            firstName={firstName}
            photoUrl={submittedPhotoUrl}
            onRestart={handleReset}
          />
        )}

        <footer className="mt-6 flex items-center justify-between text-xs text-zinc-500">
          <div>Visitor check-in</div>
          <div>Data used for safety and occasional updates.</div>
        </footer>
      </main>
    </div>
  );
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Welcome in.
      </h1>
      <p className="mb-10 max-w-md text-base text-zinc-400 sm:text-lg">
        Please take a moment to check in so we know who&apos;s in the space and can keep you
        in the loop about what&apos;s happening here.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full bg-zinc-50 px-10 py-3 text-base font-medium text-zinc-900 shadow-lg shadow-zinc-50/20 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        Start check-in
      </button>
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
        <p className="mt-3 max-w-md text-sm text-zinc-400">
          This helps us greet you properly and know who&apos;s in the space.
        </p>
      </header>

      <div className="mb-10">
        <label className="block text-sm font-medium text-zinc-300">
          Full name
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-50 outline-none ring-0 transition focus:border-zinc-400"
            placeholder="Alex Smith"
          />
        </label>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="rounded-full bg-zinc-50 px-8 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Next
        </button>
      </div>
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
        <p className="mt-3 max-w-md text-sm text-zinc-400">
          We use this to share event details, updates, and the occasional thoughtful email.
          No spam, ever.
        </p>
      </header>

      <div className="mb-10">
        <label className="block text-sm font-medium text-zinc-300">
          Email address
          <input
            autoFocus
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-50 outline-none ring-0 transition focus:border-zinc-400"
            placeholder="you@example.com"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          By continuing, you&apos;re okay with us emailing you about what&apos;s happening here.
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={onNext}
          className="rounded-full bg-zinc-50 px-8 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Next
        </button>
      </div>
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
  type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "unavailable";

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  /** Attach the current stream to the always-present <video> element. */
  const attachStream = useCallback(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Ignore play() errors (e.g. user-interaction gate).
      });
    }
  }, []);

  /** Request camera permission and start the stream. */
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      stopStream();
      streamRef.current = stream;

      // Video element is always in the DOM now, so this always works.
      attachStream();
      setStatus("ready");
    } catch (error) {
      console.error("Camera error", error);
      setStatus("denied");
    }
  }, [stopStream, attachStream]);

  // Auto-start camera when the photo step mounts.
  useEffect(() => {
    void startCamera();

    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

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

  return (
    <section className="flex flex-1 flex-col justify-center">
      <header className="mb-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Quick photo, if you&apos;re okay with it.
        </h2>
        <p className="mt-3 max-w-md text-sm text-zinc-400">
          This helps our team recognise you and keep the space safe. You can skip this if
          the camera isn&apos;t available.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
            {hasPhoto && photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Captured visitor"
                className="h-full w-full object-cover"
              />
            ) : status === "unavailable" ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                This device doesn&apos;t support camera access here. You can continue
                without a photo.
              </div>
            ) : status === "denied" ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                Camera access was blocked. You can continue without a photo, or enable it
                in your browser settings.
              </div>
            ) : (
              <>
                {/* Video element is ALWAYS in the DOM so the ref is available
                    before the stream arrives — this is the core fix. */}
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
                {(status === "idle" || status === "requesting") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-6 text-center text-sm text-zinc-500">
                    {status === "requesting"
                      ? "Requesting camera access…"
                      : "Starting camera…"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex w-full flex-1 flex-col justify-between rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-400">
          <div>
            <p className="mb-2 font-medium text-zinc-200">What we do with your photo</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-400">
              <li>Used only for internal check-in and safety.</li>
              <li>Never shared publicly.</li>
            </ul>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={hasPhoto ? handleDiscard : handleCapture}
              disabled={
                status === "unavailable" ||
                status === "denied" ||
                status === "idle" ||
                status === "requesting" ||
                isCapturing
              }
              className="rounded-full bg-zinc-50 px-6 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {hasPhoto
                ? "Discard photo"
                : isCapturing
                ? "Capturing…"
                : status === "requesting" || status === "idle"
                ? "Starting camera…"
                : "Capture photo"}
            </button>
            {hasPhoto && (
              <p className="text-xs text-emerald-400">Photo captured. You&apos;re set.</p>
            )}
            {status === "denied" && !hasPhoto && (
              <p className="text-xs text-amber-400">
                Camera access was blocked. You can still continue without a photo.
              </p>
            )}
            {status === "unavailable" && !hasPhoto && (
              <p className="text-xs text-amber-400">
                Camera isn&apos;t available on this device. You can continue without a
                photo.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="rounded-full bg-zinc-50 px-8 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Next
        </button>
      </div>
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
        <p className="mt-3 max-w-md text-sm text-zinc-400">
          This helps us understand how people are using the space and what to invite you to
          next time.
        </p>
      </header>

      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-300">
          Choose a reason
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search…"
            className="mt-3 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-400"
          />
        </label>
      </div>

      <div className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1">
        {reasons.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-zinc-500">
            No reasons configured yet. Please speak to a team member.
          </div>
        )}
        {reasons.map((reason) => {
          const isSelected = reason.id === selectedId;
          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => onSelect(reason.id)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? "bg-zinc-50 text-zinc-900"
                  : "bg-transparent text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <span>{reason.label}</span>
              {isSelected && <span className="text-xs font-medium">Selected</span>}
            </button>
          );
        })}
      </div>

      {submitError && (
        <p className="mb-3 text-sm text-rose-400">
          {submitError}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="rounded-full bg-zinc-50 px-8 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSubmitting ? "Finishing up…" : "Finish check-in"}
        </button>
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
      <h2 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        You&apos;re all set{firstName ? `, ${firstName}` : ""}.
      </h2>
      
      {photoUrl && (
        <div className="mb-6">
          <img
            src={photoUrl}
            alt="Visitor check-in photo"
            className="mx-auto h-32 w-32 rounded-full object-cover border-4 border-zinc-700"
          />
        </div>
      )}
      
      <p className="mb-8 max-w-md text-sm text-zinc-400">
        Thanks for checking in. Make yourself at home. This screen will reset for next
        visitor in a few seconds.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-full border border-zinc-700 px-8 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to start now
      </button>
    </section>
  );
}

