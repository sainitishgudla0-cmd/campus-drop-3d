"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, JourneyRail } from "@/components/auth/AuthShell";
import { Icon } from "@/components/ui/Icon";
import { ApiError, getIdCardStatus, uploadIdCard, type IdCardStatus } from "@/lib/api";
import { CONTRACT } from "@/lib/contract";
import { reencodeImage, validateImageFile } from "@/lib/image";
import { safeNext } from "@/lib/redirect";
import { go } from "@/lib/nav";

function IdCardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/onboarding/profile");
  const [status, setStatus] = useState<IdCardStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoadError("");
    getIdCardStatus()
      .then(setStatus)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) go(`/login?next=${encodeURIComponent("/verify/id-card?next=" + next)}`, router);
        else setLoadError(e instanceof Error ? e.message : "Couldn’t load your verification status.");
      });
  }, [next, router]);

  useEffect(load, [load]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(f: File | undefined | null) {
    setSubmitError("");
    if (!f) return;
    const problem = validateImageFile(f, CONTRACT.idCard.acceptedTypes, CONTRACT.idCard.maxBytes);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFileError("");
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const { blob } = await reencodeImage(file, { maxSide: 2200, quality: 0.9 });
      const result = await uploadIdCard(blob, "student-id.jpg");
      setStatus(result.state === "unknown" || result.state === "not_submitted" ? { ...result, state: "pending" } : result);
      setFile(null);
      setReplacing(false);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showUploader = status && (status.state === "not_submitted" || status.state === "rejected" || status.state === "unknown" || replacing);

  return (
    <AuthShell variant="verify">
      <JourneyRail current={2} />
      <div className="step-anim">
        <p className="eyebrow">Step 2 · Verify your student status</p>
        <h1 className="auth__title brush">
          Verify with your <em className="serif">student ID.</em>
        </h1>
        <p className="auth__lead">Your campus allows student-ID verification. Upload a clear photo of your current student ID card and the CampusDrop team will review it.</p>

        {!status && !loadError && (
          <div className="auth__checking" role="status">
            <span className="spinner--ink" /> Checking your verification status…
          </div>
        )}
        {loadError && (
          <p className="notice notice--error">
            <Icon name="alert" />
            <span>
              {loadError}{" "}
              <button className="link" onClick={load}>
                Try again
              </button>
            </span>
          </p>
        )}

        {status && !showUploader && <StatusCard status={status} onContinue={() => go(next, router)} onReplace={() => setReplacing(true)} />}

        {showUploader && (
          <div className="auth__form">
            {status?.state === "rejected" && (
              <p className="notice notice--error">
                <Icon name="alert" />
                <span>
                  <strong>Your last ID couldn’t be approved.</strong> {status.reason ? status.reason : "Please upload a clearer, uncropped photo of a current student ID."}
                </span>
              </p>
            )}

            <div
              className={`dropzone${dragging ? " is-dragging" : ""}${preview ? " has-file" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
            >
              {preview ? (
                <figure className="dropzone__preview">
                  {/* object URL preview: stays on this device until you submit */}
                  <img src={preview} alt="Preview of your student ID" />
                  <figcaption>
                    <span>{file?.name}</span>
                    <button type="button" className="link" onClick={() => inputRef.current?.click()}>
                      Choose a different photo
                    </button>
                  </figcaption>
                </figure>
              ) : (
                <button type="button" className="dropzone__empty" onClick={() => inputRef.current?.click()}>
                  <span className="dropzone__icon">
                    <Icon name="id-card" size={30} />
                  </span>
                  <strong>Drop a photo of your student ID</strong>
                  <span>or click to choose · JPG, PNG or WebP · up to {Math.round(CONTRACT.idCard.maxBytes / 1048576)} MB</span>
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={CONTRACT.idCard.acceptedTypes.join(",")}
                className="sr-only"
                aria-label="Upload student ID photo"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            <div aria-live="polite" className="auth__live">
              {fileError && (
                <p className="notice notice--error">
                  <Icon name="alert" /> {fileError}
                </p>
              )}
              {submitError && (
                <p className="notice notice--error">
                  <Icon name="alert" /> {submitError}
                </p>
              )}
            </div>

            <ul className="id-tips">
              <li>
                <Icon name="check" size={16} /> Your name, university and a valid date should be readable
              </li>
              <li>
                <Icon name="check" size={16} /> Use the whole card, flat, in good light, with no glare
              </li>
              <li>
                <Icon name="check" size={16} /> You can cover your ID number. We only need to confirm you’re a current student
              </li>
            </ul>

            <button className="btn btn--primary btn--block" onClick={submit} disabled={!file || submitting}>
              {submitting ? <span className="spinner" /> : <Icon name="upload" />}
              {submitting ? "Uploading securely…" : "Submit for review"}
            </button>
            {replacing && (
              <button className="link" onClick={() => setReplacing(false)}>
                Keep my current submission
              </button>
            )}

            <div className="privacy-box">
              <p className="privacy-box__title">
                <Icon name="lock" size={16} /> How we handle your ID
              </p>
              <ul>
                <li>It’s sent only to CampusDrop for student verification. It never appears on your profile.</li>
                <li>It’s reviewed by the CampusDrop team, and uploading doesn’t approve you automatically.</li>
                <li>Before upload, your device removes hidden photo data such as location and camera details.</li>
                <li>You’ll see the decision on this page.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function StatusCard({ status, onContinue, onReplace }: { status: IdCardStatus; onContinue: () => void; onReplace: () => void }) {
  if (status.state === "approved")
    return (
      <div className="status-card status-card--ok">
        <span className="status-card__icon">
          <Icon name="shield" size={26} />
        </span>
        <h2 className="h3">You’re verified</h2>
        <p>Your student ID was approved. Welcome to CampusDrop.</p>
        <button className="btn btn--primary" onClick={onContinue}>
          Continue <Icon name="arrow-right" />
        </button>
      </div>
    );
  return (
    <div className="status-card status-card--pending">
      <span className="status-card__icon">
        <Icon name="clock" size={26} />
      </span>
      <h2 className="h3">Your ID is in review</h2>
      <p>
        Thanks! The CampusDrop team will check it.
        {status.submittedAt ? <> Submitted {new Date(status.submittedAt).toLocaleDateString()}.</> : null} You’ll see the result on this page.
      </p>
      <ol className="status-steps" aria-label="Review progress">
        <li className="is-done">Uploaded</li>
        <li className="is-current">In review</li>
        <li>Decision</li>
      </ol>
      <div className="status-card__actions">
        <button className="btn btn--primary" onClick={onContinue}>
          Continue setting up <Icon name="arrow-right" />
        </button>
        <button className="link" onClick={onReplace}>
          Upload a clearer photo
        </button>
      </div>
    </div>
  );
}

export default function IdCardPage() {
  return (
    <Suspense>
      <IdCardInner />
    </Suspense>
  );
}
