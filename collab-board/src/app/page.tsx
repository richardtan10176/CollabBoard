// app/(auth)/signin/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const callbackUrl = qp.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState<"email" | "github" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!pwd) {
      setError("Please enter your password.");
      return;
    }

    setLoading("email");
    try {
      // Change this endpoint to match your backend:
      // e.g., /api/auth/login or Auth.js credentials provider endpoint.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // keep httpOnly cookie sessions
        body: JSON.stringify({ email, password: pwd, callbackUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Sign-in failed");
      }

      // If your API returns a redirect URL, you can read it here:
      // const { redirectTo } = await res.json();
      router.push(callbackUrl);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setLoading(provider);
    try {
      // For Auth.js (NextAuth): POST to /api/auth/signin/<provider> or call signIn()
      // Here we do a simple redirect to your backend OAuth start endpoint:
      // Adjust paths to your API gateway if FE/BE are separated.
      const url = `/api/auth/oauth/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      // Use replace to avoid back button landing on sign-in again
      window.location.replace(url);
    } catch (err: any) {
      setError("Could not initiate OAuth. Try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl ring-1 ring-white/10 p-6 md:p-8">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Access your workspace. Don’t have an account?{" "}
              <a className="text-indigo-400 hover:text-indigo-300 underline" href="/signup">
                Create one
              </a>
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm mb-1 text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-800/70 border border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 outline-none px-3 py-2"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm mb-1 text-slate-300">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full rounded-lg bg-slate-800/70 border border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 outline-none px-3 py-2"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading !== null}
              className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 font-medium transition"
            >
              {loading === "email" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-900/60 px-2 text-xs text-slate-400">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuth("github")}
              disabled={loading !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/40 px-3 py-2.5 text-sm disabled:opacity-60"
            >
              {loading === "github" ? (
                "Redirecting…"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                    <path
                      fill="currentColor"
                      d="M12 .5A12 12 0 0 0 0 12.7c0 5.4 3.4 10 8.2 11.6c.6.1.8-.2.8-.5c0-.2 0-.9 0-1.8c-3.3.7-4-1.6-4-1.6c-.6-1.5-1.5-1.9-1.5-1.9c-1.3-.9.1-.9.1-.9c1.5.1 2.2 1.6 2.2 1.6c1.3 2.2 3.4 1.6 4.2 1.2c.1-1 .5-1.6.9-2c-2.7-.3-5.5-1.4-5.5-6.1c0-1.4.5-2.5 1.3-3.4c-.1-.3-.6-1.7.1-3.6c0 0 1.1-.4 3.5 1.3a12 12 0 0 1 6.3 0c2.4-1.7 3.5-1.3 3.5-1.3c.7 1.9.2 3.3.1 3.6c.8.9 1.3 2 1.3 3.4c0 4.7-2.8 5.8-5.5 6.1c.5.4 1 1.3 1 2.7c0 2-.02 3.6-.02 4.1c0 .3.2.6.8.5A12.2 12.2 0 0 0 24 12.7A12 12 0 0 0 12 .5Z"
                    />
                  </svg>
                  GitHub
                </>
              )}
            </button>

            <button
              onClick={() => handleOAuth("google")}
              disabled={loading !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/40 px-3 py-2.5 text-sm disabled:opacity-60"
            >
              {loading === "google" ? (
                "Redirecting…"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1H12v2.9h5.3c-.23 1.45-1.6 4.25-5.3 4.25c-3.2 0-5.8-2.64-5.8-5.85s2.6-5.85 5.8-5.85c1.82 0 3.04.77 3.74 1.42l2.55-2.46C16.9 3.7 14.7 2.7 12 2.7C6.93 2.7 2.8 6.83 2.8 11.9s4.13 9.2 9.2 9.2c5.31 0 8.8-3.74 8.8-9.02c0-.6-.06-1.05-.15-1.98Z"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
