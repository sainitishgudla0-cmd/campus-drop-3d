"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, JourneyRail } from "@/components/auth/AuthShell";
import { Icon } from "@/components/ui/Icon";
import { AvatarPicker, type AvatarChoice } from "@/components/profile/AvatarPicker";
import { ProfilePic } from "@/components/profile/ProfilePic";
import {
  BasicsFields,
  ExperienceFields,
  basicsPatch,
  draftFromProfile,
  experiencePatch,
  validateBasics,
  wantsConnection,
  type Draft,
} from "@/components/profile/ProfileFields";
import { ApiError, getProfile, updateProfile, type Profile } from "@/lib/api";
import { applyIllustratedAvatar, applyOwnPhoto } from "@/lib/avatarSave";
import { CONTRACT } from "@/lib/contract";
import { YEAR_LABELS } from "@/lib/profile";
import { go } from "@/lib/nav";

type Step = 3 | 4 | 5;
const STEP_KEY = "cd_onboarding_step";

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFromProfile(null));
  const [step, setStep] = useState<Step>(3);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [picError, setPicError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    getProfile()
      .then((p) => {
        setProfile(p);
        setDraft(draftFromProfile(p));
        try {
          const s = Number(sessionStorage.getItem(STEP_KEY));
          if (s === 4 || s === 5) setStep(s);
        } catch {
          /* storage unavailable */
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) go("/login?next=%2Fonboarding%2Fprofile", router);
        else setLoadError(e instanceof Error ? e.message : "Couldn’t load your profile.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(load, [load]);

  const goStep = (s: Step) => {
    setStep(s);
    setErrors({});
    setSaveError("");
    try {
      sessionStorage.setItem(STEP_KEY, String(s));
    } catch {
      /* ignore */
    }
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  };

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const n = { ...e };
      Object.keys(patch).forEach((k) => delete n[k]);
      return n;
    });
  };

  async function save(patch: Parameters<typeof updateProfile>[0], nextStep: Step | "done") {
    setSaving(true);
    setSaveError("");
    try {
      await updateProfile(patch);
      const fresh = await getProfile().catch(() => null);
      if (fresh) setProfile(fresh);
      if (nextStep === "done") {
        try {
          sessionStorage.removeItem(STEP_KEY);
        } catch {
          /* ignore */
        }
        go("/home", router);
      } else goStep(nextStep);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return go("/login?next=%2Fonboarding%2Fprofile", router);
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      setSaveError(e instanceof Error ? e.message : "Couldn’t save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function savePicture(choice: AvatarChoice) {
    setPicSaving(true);
    setPicError("");
    try {
      if (choice.kind === "avatar") {
        const r = await applyIllustratedAvatar(choice.id, profile);
        if (!r.ok) return setPicError(r.message);
        if (r.profile) setProfile(r.profile);
      } else {
        const p = await applyOwnPhoto(choice.file, profile);
        if (p) setProfile(p);
      }
      setPickerOpen(false);
    } catch (e) {
      setPicError(e instanceof Error ? e.message : "Couldn’t save your picture.");
    } finally {
      setPicSaving(false);
    }
  }

  const lookingLabel = CONTRACT.lookingFor.find((o) => o.value === draft.lookingFor)?.label ?? draft.lookingFor;

  return (
    <AuthShell variant="onboarding">
      <JourneyRail current={step} />

      {loading ? (
        <div className="auth__checking" role="status">
          <span className="spinner--ink" /> Loading your profile…
        </div>
      ) : loadError ? (
        <p className="notice notice--error">
          <Icon name="alert" />
          <span>
            {loadError}{" "}
            <button className="link" onClick={load}>
              Try again
            </button>
          </span>
        </p>
      ) : step === 3 ? (
        <div className="step-anim" key="s3">
          <p className="eyebrow">Step 3 · Build your profile</p>
          <h1 className="auth__title brush">
            Hello, <em className="serif">you.</em>
          </h1>
          <p className="auth__lead">A few basics so your drops feel like you. Your profile isn’t public. It’s only visible within your campus network on CampusDrop.</p>

          <div className="pic-row">
            <ProfilePic profile={{ avatar: profile?.avatar ?? "", name: draft.name }} size={96} label />
            <div>
              <p className="pic-row__title">Profile picture</p>
              <p className="field__hint">Upload a photo or pick an illustrated avatar. This is optional.</p>
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPickerOpen(true)}>
                <Icon name="image" /> {profile?.avatar ? "Change picture" : "Choose a picture"}
              </button>
            </div>
          </div>

          <form
            className="auth__form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const v = validateBasics(draft);
              setErrors(v);
              if (Object.keys(v).length) return;
              save(basicsPatch(draft), 4);
            }}
          >
            <BasicsFields d={draft} set={set} errors={errors} />
            <SaveBar saving={saving} error={saveError} label="Save & continue" />
          </form>
        </div>
      ) : step === 4 ? (
        <div className="step-anim" key="s4">
          <p className="eyebrow">Step 4 · Choose your experience</p>
          <h1 className="auth__title brush">
            What are you <em className="serif">here for?</em>
          </h1>
          <p className="auth__lead">Friendship is the heart of CampusDrop. Connection drops are an extra you can turn on, and off again, whenever you like.</p>
          <form
            className="auth__form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (wantsConnection(draft.lookingFor) && draft.connectionPreferenceGenders.length === 0) {
                setErrors({ connectionPreferenceGenders: "Choose who you’re open to connection drops with, or pick friendship only." });
                return;
              }
              save(experiencePatch(draft), 5);
            }}
          >
            <ExperienceFields d={draft} set={set} errors={errors} />
            <SaveBar saving={saving} error={saveError} label="Save & continue" onBack={() => goStep(3)} />
          </form>
        </div>
      ) : (
        <div className="step-anim" key="s5">
          <p className="eyebrow">Step 5 · Review</p>
          <h1 className="auth__title brush">
            Looking <em className="serif">good.</em>
          </h1>
          <p className="auth__lead">Here’s a preview of your profile. It isn’t public, and it’s only visible within your campus network.</p>

          <article className="review-card">
            <div className="review-card__top">
              <ProfilePic profile={{ avatar: profile?.avatar ?? "", name: draft.name }} size={88} label />
              <div>
                <h2 className="h3">
                  {draft.name || "Your name"}
                  {draft.age ? <span className="muted">, {draft.age}</span> : null}
                </h2>
                <p className="muted">
                  {[draft.program, draft.year ? YEAR_LABELS[Number(draft.year) - 1] : "", profile?.college].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button className="link" onClick={() => goStep(3)}>
                Edit
              </button>
            </div>
            {draft.bio && <p className="review-card__bio">“{draft.bio}”</p>}
            <ul className="tag-list">
              {draft.interests.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="review-card__row">
              <span className="meta">Experience</span>
              <span>{lookingLabel}</span>
              <button className="link" onClick={() => goStep(4)}>
                Edit
              </button>
            </div>
          </article>

          <div className="privacy-box">
            <p className="privacy-box__title">
              <Icon name="lock" size={16} /> Your privacy
            </p>
            <ul>
              <li>Your email and any student ID you uploaded never appear on your profile.</li>
              <li>Nobody can message you until you choose to connect, and you can mute, leave or stop any chat.</li>
              <li>
                Fine-tune visibility, blocking and notifications any time in{" "}
                <a className="link" href="/settings">
                  Settings & privacy
                </a>
                .
              </li>
            </ul>
          </div>

          <SaveBar saving={saving} error={saveError} label="Finish & open CampusDrop" onBack={() => goStep(4)} onSubmit={() => save({}, "done")} />
        </div>
      )}

      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSave={savePicture} currentUrl={profile?.avatar} saving={picSaving} error={picError} />
    </AuthShell>
  );
}

function SaveBar({ saving, error, label, onBack, onSubmit }: { saving: boolean; error: string; label: string; onBack?: () => void; onSubmit?: () => void }) {
  return (
    <div className="savebar">
      <div aria-live="polite" className="auth__live">
        {error && (
          <p className="notice notice--error">
            <Icon name="alert" /> {error}
          </p>
        )}
      </div>
      <div className="savebar__row">
        {onBack && (
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            <Icon name="arrow-left" /> Back
          </button>
        )}
        <button type={onSubmit ? "button" : "submit"} onClick={onSubmit} className="btn btn--primary savebar__main" disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? "Saving…" : label}
          {!saving && <Icon name="arrow-right" />}
        </button>
      </div>
    </div>
  );
}
