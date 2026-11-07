"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { OtpInput } from "./OtpInput";
import { ApiError, sendOtp, verifyOtp, type AuthMode, type University, type VerifyOtpResult } from "@/lib/api";
import { uniTitle } from "@/lib/universities";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CodeStep({
  email,
  mode,
  university,
  expiresInSeconds,
  onBack,
  onVerified,
  onNoAccount,
}: {
  email: string;
  mode: AuthMode;
  university?: University | null;
  expiresInSeconds: number;
  onBack: () => void;
  onVerified: (r: VerifyOtpResult) => Promise<void> | void;
  onNoAccount?: () => void;
}) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(expiresInSeconds);
  const [cooldown, setCooldown] = useState(60);
  const [status, setStatus] = useState<"idle" | "verifying" | "resending" | "success">("idle");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((s) => Math.max(0, s - 1));
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const expired = left <= 0;

  async function verify(value = code) {
    if (value.length !== 6 || status === "verifying" || status === "success" || expired) return;
    setError("");
    setInfo("");
    setStatus("verifying");
    try {
      const result = await verifyOtp(email, value, mode, university?.id);
      setStatus("success");
      await onVerified(result);
    } catch (e) {
      setStatus("idle");
      if (mode === "login" && e instanceof ApiError && e.status === 404 && onNoAccount) return onNoAccount();
      if (e instanceof ApiError && e.status === 429 && e.retryAfterSeconds) setError(`Too many attempts. Try again in ${e.retryAfterSeconds}s.`);
      else setError(e instanceof Error ? e.message : "Invalid verification code.");
      setCode("");
    }
  }

  async function resend() {
    if (cooldown > 0 || status !== "idle") return;
    setError("");
    setInfo("");
    setStatus("resending");
    try {
      const r = await sendOtp(email, mode, university?.id);
      setLeft(r.expiresInSeconds ?? 600);
      setCooldown(60);
      setCode("");
      setInfo("A new code is on its way. Only the latest code will work.");
    } catch (e) {
      if (mode === "login" && e instanceof ApiError && e.status === 404 && onNoAccount) return onNoAccount();
      setError(e instanceof ApiError && e.retryAfterSeconds ? `Please wait ${e.retryAfterSeconds}s before requesting another code.` : e instanceof Error ? e.message : "Failed to resend. Try again.");
    } finally {
      setStatus((s) => (s === "resending" ? "idle" : s));
    }
  }

  return (
    <div className="step-anim">
      <p className="eyebrow">Check your inbox</p>
      <h1 className="auth__title brush">
        Enter your <em className="serif">code.</em>
      </h1>
      <p className="auth__lead">
        We sent a 6-digit code to <strong>{email}</strong>
        {university ? <> for {uniTitle(university)}</> : null}.
      </p>

      <form
        className="auth__form"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
        noValidate
      >
        <div className="code-head">
          <span className="field__label">6-digit code</span>
          <span className={`code-timer${left < 60 ? " code-timer--urgent" : ""}`} aria-live="off">
            <Icon name="clock" size={14} /> {expired ? "Expired" : mmss(left)}
          </span>
        </div>
        <OtpInput value={code} onChange={setCode} onComplete={(v) => verify(v)} disabled={expired || status === "verifying" || status === "success"} invalid={!!error} describedBy="otp-help" />

        <div aria-live="polite" className="auth__live">
          {error && (
            <p className="notice notice--error">
              <Icon name="alert" /> {error}
            </p>
          )}
          {info && (
            <p className="notice notice--ok">
              <Icon name="mail" /> {info}
            </p>
          )}
          {status === "success" && (
            <p className="notice notice--ok">
              <Icon name="check" /> Verified. Taking you in…
            </p>
          )}
          {expired && status !== "success" && (
            <p className="notice notice--warn">
              <Icon name="clock" /> This code expired. Request a new one below.
            </p>
          )}
        </div>

        {expired ? (
          <button type="button" className="btn btn--primary btn--block" onClick={resend} disabled={status !== "idle" || cooldown > 0}>
            {status === "resending" ? <span className="spinner" /> : <Icon name="refresh" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
          </button>
        ) : (
          <button type="submit" className="btn btn--primary btn--block" disabled={code.length < 6 || status === "verifying" || status === "success"}>
            {status === "verifying" ? <span className="spinner" /> : status === "success" ? <Icon name="check" /> : null}
            {status === "verifying" ? "Verifying…" : status === "success" ? "Verified" : "Verify and continue"}
            {status === "idle" && <Icon name="arrow-right" />}
          </button>
        )}

        <div className="code-actions">
          {!expired &&
            (cooldown > 0 ? (
              <span className="muted">Resend available in {cooldown}s</span>
            ) : (
              <button type="button" className="link" onClick={resend} disabled={status !== "idle"}>
                {status === "resending" ? "Sending a new code…" : "Resend code"}
              </button>
            ))}
          <button type="button" className="link" onClick={onBack}>
            {mode === "login" ? "Change email" : "Change email or university"}
          </button>
        </div>

        <p id="otp-help" className="field__hint">
          Delivery can take a few minutes. Check spam, promotions or your campus quarantine folder. Still nothing? Email{" "}
          <a className="link" href="mailto:support@campusdrop.social">
            support@campusdrop.social
          </a>
          .
        </p>
      </form>
    </div>
  );
}
