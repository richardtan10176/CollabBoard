// src/app/auth/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { styles } from "./styles";

export default function SignInPage() {
  const router = useRouter();
  const qp = useSearchParams();
  const callbackUrl = qp.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] =
    useState<"email" | "github" | "google" | "dev" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password: pwd, callbackUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Sign-in failed");
      }

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
      const url = `/api/auth/oauth/${provider}?callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`;
      window.location.replace(url);
    } catch {
      setError("Could not initiate OAuth. Try again.");
      setLoading(null);
    }
  }

  /**  Dev override:
   *  - Set a temporary non-HttpOnly cookie `sid` so middleware treats the user as authenticated.
   *  - Redirect straight to /main (replace to avoid back button showing /auth).
   *  - Remove this in production.
   */
  function handleDevLogin() {
    setLoading("dev");
    // 1 day expiry; SameSite=Lax; Path=/ so middleware sees it on all routes
    document.cookie = `sid=dev-local; Path=/; Max-Age=86400; SameSite=Lax`;
    router.replace("/main");
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className="mb-6">
          <h1 className={styles.headerTitle}>Sign in</h1>
          <p className={styles.headerSubtle}>
            Access your workspace. Don’t have an account?{" "}
            <a className={styles.link} href="/signup">
              Create one
            </a>
          </p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading !== null}
            className={`${styles.btnBase} ${styles.btnPrimary}`}
          >
            {loading === "email" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className={styles.dividerWrap}>
          <div className={styles.dividerLine}>
            <div className={styles.dividerHr} />
          </div>
          <div className={styles.dividerTextWrap}>
            <span className={styles.dividerText}>or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuth("github")}
            disabled={loading !== null}
            className={styles.btnOAuth}
          >
            {loading === "github" ? "Redirecting…" : "GitHub"}
          </button>

          <button
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
            className={styles.btnOAuth}
          >
            {loading === "google" ? "Redirecting…" : "Google"}
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={handleDevLogin}
            disabled={loading !== null}
            className={`${styles.btnBase} ${styles.btnDev}`}
          >
            {loading === "dev" ? "Loading…" : "Dev Override Login → Main"}
          </button>
        </div>
      </div>
    </div>
  );
}
