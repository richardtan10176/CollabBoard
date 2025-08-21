// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-semibold">CollabBoard</h1>
        <p className="text-slate-400">
          A modern collaborative markdown editor with workspaces, boards, and realtime editing.
        </p>
        <a
          href="/auth"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 font-medium transition"
        >
          Go to Sign In
        </a>
      </div>
    </main>
  );
}
