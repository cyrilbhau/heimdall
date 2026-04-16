import Link from "next/link";
import { Brand } from "./components/brand";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-4 pr-28 md:px-10 md:pr-32">
          <Brand sublabel="ConsciousHQ" />
          <nav className="hidden items-center gap-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)] sm:flex">
            <Link
              href="/kiosk"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              Kiosk
            </Link>
            <Link
              href="/admin"
              className="transition-colors hover:text-[var(--foreground)]"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="border-b">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 py-20 text-center md:px-10 md:py-28">
            <Brand size="lg" className="mb-10 justify-center" />
            <span className="section-label mb-6">Visitor portal</span>

            <h1 className="font-[family-name:var(--font-heading)] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl md:text-7xl">
              Welcome to the{" "}
              <span style={{ color: "var(--primary)" }}>door</span>.
            </h1>

            <p className="mt-6 max-w-[620px] text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
              This is the admin entry point for ConsciousHQ. The visitor
              check-in flow lives at{" "}
              <code className="rounded-sm bg-[var(--muted)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--foreground)]">
                /kiosk
              </code>{" "}
              and the lightweight dashboard at{" "}
              <code className="rounded-sm bg-[var(--muted)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--foreground)]">
                /admin
              </code>
              .
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/kiosk"
                className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--primary-foreground)] transition-[filter] hover:brightness-110"
              >
                Open kiosk
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-sm border bg-[var(--card)] px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
              >
                Open admin
              </Link>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="border-b">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <span className="section-label mb-3">What happens here</span>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                  A quiet check-in, before the day begins.
                </h2>
              </div>
            </div>
            <div
              className="grid grid-cols-1 gap-px border md:grid-cols-3"
              style={{ background: "var(--border)" }}
            >
              <FeatureTile
                index="01"
                title="Check in"
                body="Guests identify themselves and their reason for visiting, so the team always knows who’s in the space."
              />
              <FeatureTile
                index="02"
                title="Stay safe"
                body="A quick photo and light record-keeping make the space safer for residents, staff, and guests alike."
              />
              <FeatureTile
                index="03"
                title="Stay in the loop"
                body="Visitors can opt in to hear about upcoming events, residencies, and the occasional thoughtful note."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:px-10">
            <span>ConsciousHQ · Indiranagar</span>
            <span>Visitor portal</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureTile({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-6 bg-[var(--card)] p-8 transition-colors hover:bg-[var(--muted)] md:p-10">
      <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        {index}
      </span>
      <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        {body}
      </p>
    </div>
  );
}
