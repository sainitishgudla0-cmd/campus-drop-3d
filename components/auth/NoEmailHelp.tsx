"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { sendSupportRequest, type University } from "@/lib/api";
import { uniTitle } from "@/lib/universities";

/**
 * "Don't have access to your university email?"
 * The existing backend supports student-ID verification on campuses that allow
 * personal-email sign-up (the server then returns `requiresIdCard` after the code).
 * For campuses that require a campus email, we route the student to the support team.
 */
export function NoEmailHelp({ university, onUsePersonal }: { university: University | null; onUsePersonal?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`noemail${open ? " is-open" : ""}`}>
      <button type="button" className="noemail__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="id-card" size={18} />
        <span>Don’t have access to your university email? Verify using your student ID.</span>
        <Icon name={open ? "x" : "plus"} size={16} />
      </button>
      {open && (
        <div className="noemail__body">
          {!university ? (
            <p>Pick your campus first, then we’ll show you the options it supports.</p>
          ) : university.allowPublicEmailLogin ? (
            <>
              <p>
                <strong>{uniTitle(university)}</strong> accepts student-ID verification. Sign up with a personal email, and after the code we’ll ask
                for a clear photo of your student ID.
              </p>
              <ul className="ticks">
                <li>The CampusDrop team reviews it. It is never approved automatically.</li>
                <li>Your ID is only used for verification and never appears on your profile.</li>
                <li>Once it’s uploaded, you can carry on setting up your profile.</li>
              </ul>
              {onUsePersonal && (
                <button type="button" className="btn btn--sm btn--ghost" onClick={onUsePersonal}>
                  Use a personal email instead
                </button>
              )}
            </>
          ) : (
            <IdSupportRequest university={university} />
          )}
        </div>
      )}
    </div>
  );
}

function IdSupportRequest({ university }: { university: University }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  if (state === "sent")
    return (
      <p className="notice notice--ok">
        <Icon name="check" /> Sent. The team will reply to {email} about verifying with your student ID.
      </p>
    );

  return (
    <form
      className="request-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError("");
        try {
          await sendSupportRequest({
            category: "login_otp",
            subject: `Student ID verification request · ${uniTitle(university)}`,
            message: message || `I can't access my ${uniTitle(university)} email and would like to verify with my student ID.`,
            email,
            anonymous: false,
          });
          setState("sent");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not send. Please email support@campusdrop.social.");
          setState("idle");
        }
      }}
    >
      <p>
        <strong>{uniTitle(university)}</strong> currently requires a campus email. Ask the team to verify you with your student ID instead. Please don’t attach
        your ID here. The team will reply with the next steps.
      </p>
      <input className="input input--sm" type="email" required placeholder="Email we can reach you at" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Contact email" />
      <textarea className="textarea" rows={3} placeholder="Why can’t you access your campus email? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
      {error && (
        <p className="field__error">
          <Icon name="alert" /> {error}
        </p>
      )}
      <div className="request-form__actions">
        <button className="btn btn--sm" type="submit" disabled={state === "sending"}>
          {state === "sending" ? <span className="spinner" /> : null} Request ID verification
        </button>
      </div>
    </form>
  );
}
