"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, JourneyRail } from "@/components/auth/AuthShell";
import { CampusPicker, UniversityRequestForm } from "@/components/auth/CampusPicker";
import { CodeStep } from "@/components/auth/CodeStep";
import { NoEmailHelp } from "@/components/auth/NoEmailHelp";
import { Icon } from "@/components/ui/Icon";
import { ApiError, getSession, getUniversities, sendOtp, type University } from "@/lib/api";
import { domainHint, emailProblem, isEmail, uniTitle } from "@/lib/universities";
import { rememberReferral, routeAfterVerify } from "@/lib/authFlow";
import { safeNext } from "@/lib/redirect";
import { go } from "@/lib/nav";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"account" | "code">("account");
  const [unis, setUnis] = useState<University[]>([]);
  const [unisLoading, setUnisLoading] = useState(true);
  const [unisError, setUnisError] = useState("");
  const [uni, setUni] = useState<University | null>(null);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [adult, setAdult] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [expires, setExpires] = useState(600);
  const emailRef = useRef<HTMLInputElement>(null);

  const loadUnis = useCallback(() => {
    setUnisLoading(true);
    setUnisError("");
    getUniversities()
      .then((list) => {
        setUnis(list);
        if (!list.length) setUnisError("No active campuses are configured yet.");
      })
      .catch(() => setUnisError("Campus list is temporarily unavailable."))
      .finally(() => setUnisLoading(false));
  }, []);

  useEffect(() => {
    rememberReferral(params);
    getSession().then((s) => s.authenticated && go(safeNext(params.get("next")), router));
    loadUnis();
  }, [loadUnis, params, router]);

  // If arriving with an email, pre-select the campus whose domain matches.
  useEffect(() => {
    if (uni || !email.includes("@") || !unis.length) return;
    const domain = email.split("@")[1]?.toLowerCase();
    const match = unis.find((u) => u.domains.some((d) => domain === d || domain?.endsWith("." + d)));
    if (match) setUni(match);
  }, [unis, email, uni]);

  const emailErr = touched ? emailProblem(email, uni) : "";
  const canSend = !!uni && isEmail(email) && !emailProblem(email, uni) && adult && !sending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSend || !uni) return;
    setError("");
    setSending(true);
    try {
      const r = await sendOtp(email.trim().toLowerCase(), "signup", uni.id);
      setExpires(r.expiresInSeconds ?? 600);
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("This email already has an account. Log in instead.");
      } else if (err instanceof ApiError && err.retryAfterSeconds) setError(`Too many requests. Try again in ${err.retryAfterSeconds}s.`);
      else setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setSending(false);
    }
  }

  const loginHref = `/login?${new URLSearchParams({ ...(email ? { email } : {}), ...(params.get("next") ? { next: params.get("next")! } : {}) })}`;

  return (
    <AuthShell variant="signup">
      <JourneyRail current={step === "account" ? 1 : 2} />

      {step === "account" ? (
        <div className="step-anim">
          <p className="eyebrow">Step 1 · Create your account</p>
          <h1 className="auth__title brush">
            Join <em className="serif">your campus.</em>
          </h1>
          <p className="auth__lead">CampusDrop is only for verified students aged 18 and over. Pick your university and we’ll email you a one-time code.</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            <CampusPicker universities={unis} selected={uni} onSelect={setUni} loading={unisLoading} error={unisError} onRetry={loadUnis} />
            {!uni && <UniversityRequestForm defaultEmail={email} />}

            <label className="field">
              <span className="field__label">
                {uni?.allowPublicEmailLogin ? "Email" : "University email"}
                {uni && domainHint(uni) && <span className="meta">{domainHint(uni)}</span>}
              </span>
              <span className="input-icon">
                <Icon name="mail" />
                <input
                  ref={emailRef}
                  className="input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={uni ? (uni.domains[0] && !uni.allowPublicEmailLogin ? `yourname@${uni.domains[0]}` : "you@university.edu or personal email") : "Select your campus first"}
                  value={email}
                  disabled={!uni}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!emailErr || undefined}
                  aria-describedby="email-help"
                  required
                />
              </span>
              {emailErr ? (
                <span id="email-help" className="field__error">
                  <Icon name="alert" /> {emailErr}
                </span>
              ) : (
                <span id="email-help" className="field__hint">
                  {uni?.allowPublicEmailLogin
                    ? "A campus email verifies you instantly. With a personal email we’ll also ask for your student ID."
                    : "Only used to confirm you’re a student. Never shown on your profile."}
                </span>
              )}
            </label>

            <label className="check">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span>
                I’m 18 or older, a current student, and I agree to the{" "}
                <a className="link" href="/terms" target="_blank" rel="noopener">
                  Terms
                </a>{" "}
                and{" "}
                <a className="link" href="/privacy" target="_blank" rel="noopener">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <div aria-live="polite" className="auth__live">
              {error && (
                <p className="notice notice--error">
                  <Icon name="alert" />
                  <span>
                    {error}{" "}
                    {error.includes("Log in") && (
                      <Link className="link" href={loginHref}>
                        Go to log in
                      </Link>
                    )}
                  </span>
                </p>
              )}
            </div>

            <button className="btn btn--primary btn--block" type="submit" disabled={!canSend}>
              {sending ? <span className="spinner" /> : null}
              {sending ? "Sending code…" : "Send signup code"}
              {!sending && <Icon name="arrow-right" />}
            </button>

            <NoEmailHelp
              university={uni}
              onUsePersonal={() => {
                setEmail("");
                emailRef.current?.focus();
              }}
            />
          </form>

          <p className="auth__switch">
            Already on CampusDrop?{" "}
            <Link className="link" href={loginHref}>
              Log in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <CodeStep
            email={email.trim().toLowerCase()}
            mode="signup"
            university={uni}
            expiresInSeconds={expires}
            onBack={() => setStep("account")}
            onVerified={(r) => routeAfterVerify(r, params, router)}
          />
          <div className="code-alt">
            <NoEmailHelp university={uni} onUsePersonal={() => setStep("account")} />
            {uni && <p className="field__hint">Signing up for {uniTitle(uni)}.</p>}
          </div>
        </>
      )}
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
