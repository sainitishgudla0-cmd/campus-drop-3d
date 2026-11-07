"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { CodeStep } from "@/components/auth/CodeStep";
import { Icon } from "@/components/ui/Icon";
import { ApiError, getSession, sendOtp } from "@/lib/api";
import { isEmail } from "@/lib/universities";
import { rememberReferral, routeAfterVerify } from "@/lib/authFlow";
import { safeNext } from "@/lib/redirect";
import { go } from "@/lib/nav";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [noAccount, setNoAccount] = useState(false);
  const [expires, setExpires] = useState(600);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    rememberReferral(params);
    getSession().then((s) => {
      if (s.authenticated) go(safeNext(params.get("next")), router);
      else setChecking(false);
    });
  }, [params, router]);

  const emailError = touched && email && !isEmail(email) ? "Enter a valid email address." : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isEmail(email) || sending) return;
    setError("");
    setNoAccount(false);
    setSending(true);
    try {
      const r = await sendOtp(email.trim().toLowerCase(), "login");
      setExpires(r.expiresInSeconds ?? 600);
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNoAccount(true);
      else if (err instanceof ApiError && err.retryAfterSeconds) setError(`Too many requests. Try again in ${err.retryAfterSeconds}s.`);
      else setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setSending(false);
    }
  }

  const signupHref = `/signup?${new URLSearchParams({ ...(email ? { email } : {}), ...(params.get("next") ? { next: params.get("next")! } : {}) }).toString()}`;

  return (
    <AuthShell variant="login">
      {checking ? (
        <div className="auth__checking" role="status">
          <span className="spinner spinner--ink" /> Checking your session…
        </div>
      ) : step === "email" ? (
        <div className="step-anim">
          <p className="eyebrow">Welcome back</p>
          <h1 className="auth__title brush">
            Log in to <em className="serif">your campus.</em>
          </h1>
          <p className="auth__lead">Enter the email linked to your CampusDrop account. We’ll send you a one-time code. There’s no password to remember.</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            <label className="field">
              <span className="field__label">University email</span>
              <span className="input-icon">
                <Icon name="mail" />
                <input
                  className="input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNoAccount(false);
                  }}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!emailError || undefined}
                  aria-describedby={emailError ? "email-err" : undefined}
                  autoFocus
                  required
                />
              </span>
              {emailError && (
                <span id="email-err" className="field__error">
                  <Icon name="alert" /> {emailError}
                </span>
              )}
            </label>

            <div aria-live="polite" className="auth__live">
              {error && (
                <p className="notice notice--error">
                  <Icon name="alert" /> {error}
                </p>
              )}
              {noAccount && (
                <p className="notice notice--warn">
                  <Icon name="info" />
                  <span>
                    We couldn’t find an account for this email.{" "}
                    <Link className="link" href={signupHref}>
                      Create one in a minute
                    </Link>
                    .
                  </span>
                </p>
              )}
            </div>

            <button className="btn btn--primary btn--block" type="submit" disabled={sending || !email}>
              {sending ? <span className="spinner" /> : null}
              {sending ? "Sending code…" : "Send login code"}
              {!sending && <Icon name="arrow-right" />}
            </button>

            <div className="auth__assure">
              <span className="auth__assure-icon">
                <Icon name="lock" size={18} />
              </span>
              <div>
                <p className="auth__assure-title">Forgot your password? You don’t have one.</p>
                <p className="auth__assure-copy">Each login uses a fresh code sent to your email, so there’s nothing to reset.</p>
              </div>
            </div>
          </form>

          <p className="auth__switch">
            New to CampusDrop?{" "}
            <Link className="link" href={signupHref}>
              Join your campus
            </Link>
          </p>
        </div>
      ) : (
        <CodeStep
          email={email.trim().toLowerCase()}
          mode="login"
          expiresInSeconds={expires}
          onBack={() => setStep("email")}
          onVerified={(r) => routeAfterVerify(r, params, router)}
          onNoAccount={() => {
            setStep("email");
            setNoAccount(true);
          }}
        />
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
