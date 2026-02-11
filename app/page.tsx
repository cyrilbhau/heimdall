export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-50">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-10 text-center sm:px-12">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Visitor kiosk
        </h1>
        <p className="mb-8 max-w-lg text-sm text-zinc-400 sm:text-base">
          This is the admin entry point. The actual check-in flow lives at{" "}
          <code className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
            /kiosk
          </code>{" "}
          and the lightweight dashboard at{" "}
          <code className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
            /admin
          </code>
          .
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/kiosk"
            className="rounded-full bg-zinc-50 px-8 py-2.5 text-sm font-medium text-zinc-900 shadow-md shadow-zinc-50/20 transition hover:bg-zinc-200"
          >
            Open kiosk
          </a>
          <a
            href="/admin"
            className="rounded-full border border-zinc-700 px-8 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Open admin
          </a>
        </div>
      </main>
    </div>
  );
}
