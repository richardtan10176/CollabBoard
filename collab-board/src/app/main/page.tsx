// src/app/main/page.tsx
export default function MainPage() {
  // This page renders only when middleware allows (i.e., user has a session cookie).
  // Still enforce authorization on your API calls inside this page.
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <a
            href="/api/auth/logout"
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm"
          >
            Logout
          </a>
        </header>

        {/* Replace this with your command rail + top tabs + canvas layout */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 p-4">Left Command Rail (WIP)</div>
          <div className="md:col-span-2 rounded-xl border border-slate-800 p-4">
            Main Canvas / Boards / Notes
          </div>
        </section>
      </div>
    </main>
  );
}
