"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/profile/AppHeader";
import { AvatarPicker, type AvatarChoice } from "@/components/profile/AvatarPicker";
import { ProfilePic } from "@/components/profile/ProfilePic";
import { BasicsFields, ExperienceFields, basicsPatch, draftFromProfile, experiencePatch, validateBasics, wantsConnection, type Draft } from "@/components/profile/ProfileFields";
import { Icon } from "@/components/ui/Icon";
import { ApiError, deleteProfilePhoto, getMe, getProfile, updateProfile, type Profile } from "@/lib/api";
import { applyIllustratedAvatar, applyOwnPhoto } from "@/lib/avatarSave";
import { isIllustratedAvatar } from "@/lib/avatars";
import { CONTRACT } from "@/lib/contract";
import { YEAR_LABELS } from "@/lib/profile";
import { go } from "@/lib/nav";

type Editing = null | "basics" | "experience";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [picError, setPicError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    Promise.all([getProfile(), getMe().catch(() => ({ user: undefined }))])
      .then(([p, me]) => {
        setProfile(p);
        setEmail(me.user?.email ?? "");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) go("/login?next=%2Fprofile", router);
        else setLoadError(e instanceof Error ? e.message : "Couldn’t load your profile.");
      })
      .finally(() => setLoading(false));
  }, [router]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
      setToast("Profile picture updated");
    } catch (e) {
      setPicError(e instanceof Error ? e.message : "Couldn’t save your picture.");
    } finally {
      setPicSaving(false);
    }
  }

  async function removePhoto(index: number) {
    const id = profile?.photoIds?.[index];
    if (!id || !window.confirm("Remove this photo from your profile?")) return;
    try {
      await deleteProfilePhoto(id);
      setProfile(await getProfile());
      setToast("Photo removed");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn’t remove the photo.");
    }
  }

  if (loading || loadError || !profile)
    return (
      <>
        <AppHeader profile={profile} />
        <main id="main" className="profile-wrap">
          {loadError ? (
            <p className="notice notice--error">
              <Icon name="alert" />
              <span>
                {loadError}{" "}
                <button className="link" onClick={load}>
                  Try again
                </button>
              </span>
            </p>
          ) : (
            <div className="profile-skeleton" role="status" aria-label="Loading your profile">
              <span />
              <span />
              <span />
            </div>
          )}
        </main>
      </>
    );

  const year = profile.year ? YEAR_LABELS[profile.year - 1] : "";
  const looking = CONTRACT.lookingFor.find((o) => o.value === profile.lookingFor);
  const details = [
    { k: "Hometown", v: profile.hometown, icon: "pin" },
    { k: "MBTI", v: profile.mbti, icon: "spark" },
    { k: "Zodiac", v: profile.zodiac, icon: "spark" },
    { k: "Favourite places", v: profile.favoritePlaces.join(", "), icon: "pin" },
  ].filter((d) => d.v);

  return (
    <>
      <AppHeader profile={profile} />
      <main id="main" className="profile-wrap">
        <section className="profile-hero">
          <div className="profile-hero__pic">
            <ProfilePic profile={profile} size={168} label />
            <button className="profile-hero__edit-pic" onClick={() => setPickerOpen(true)} aria-label="Change profile picture">
              <Icon name="edit" size={18} />
            </button>
          </div>
          <div className="profile-hero__text">
            <p className="eyebrow">
              {profile.verified ? (
                <>
                  <Icon name="shield" size={14} /> Verified student
                </>
              ) : (
                "Verification pending"
              )}
            </p>
            <h1 className="brush profile-hero__name">
              {profile.name || "Your name"}
              {profile.age ? <em className="serif">, {profile.age}</em> : null}
            </h1>
            <p className="profile-hero__meta">{[profile.program, year, profile.college].filter(Boolean).join(" · ")}</p>
            <div className="profile-hero__actions">
              <button className="btn btn--sm" onClick={() => setEditing("basics")}>
                <Icon name="edit" /> Edit profile
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => setPickerOpen(true)}>
                <Icon name="image" /> Change picture
              </button>
            </div>
          </div>
          <CompletionRing pct={profile.completionPct} />
        </section>

        <div className="profile-grid">
          <section className="pcard pcard--about">
            <header className="pcard__head">
              <h2 className="h3">About</h2>
              <button className="link" onClick={() => setEditing("basics")}>
                Edit
              </button>
            </header>
            {profile.bio ? <p className="pcard__bio">“{profile.bio}”</p> : <p className="muted">Add a short intro so your drops know what to talk about.</p>}
            <h3 className="meta pcard__sub">Interests</h3>
            {profile.interests.length ? (
              <ul className="tag-list">
                {profile.interests.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No interests yet.</p>
            )}
            {details.length > 0 && (
              <dl className="pcard__details">
                {details.map((d) => (
                  <div key={d.k}>
                    <dt className="meta">{d.k}</dt>
                    <dd>{d.v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="pcard pcard--exp">
            <header className="pcard__head">
              <h2 className="h3">Your drops</h2>
              <button className="link" onClick={() => setEditing("experience")}>
                Edit
              </button>
            </header>
            <p className="pcard__big">{looking?.label ?? (profile.lookingFor || "Friendship drops")}</p>
            <p className="muted">{looking?.hint ?? "Choose what you’d like from your weekly drop."}</p>
            {wantsConnection(profile.lookingFor ?? CONTRACT.lookingFor[0].value) && profile.connectionPreferenceGenders.length > 0 && (
              <p className="pcard__small">Open to: {profile.connectionPreferenceGenders.map((g) => CONTRACT.genders.find((x) => x.value === g)?.label ?? g).join(", ")}</p>
            )}
          </section>

          <section className="pcard pcard--photos">
            <header className="pcard__head">
              <h2 className="h3">Photos</h2>
              <button className="link" onClick={() => setPickerOpen(true)}>
                Add
              </button>
            </header>
            {profile.photos.length ? (
              <ul className="photo-grid">
                {profile.photos.map((src, i) => (
                  <li key={src + i}>
                    <img src={src} alt={`Profile photo ${i + 1}`} loading="lazy" />
                    {isIllustratedAvatar(src) && <span className="badge-illustrative">Illustrated</span>}
                    {profile.photoIds?.[i] && (
                      <button className="photo-grid__del" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No photos yet. Add one, or keep an illustrated avatar.</p>
            )}
          </section>

          <section className="pcard pcard--privacy">
            <header className="pcard__head">
              <h2 className="h3">Privacy & safety</h2>
            </header>
            <ul className="plinks">
              <li>
                <a href="/settings">
                  <Icon name="sliders" size={18} /> Settings, visibility & notifications <Icon name="arrow-right" size={16} />
                </a>
              </li>
              <li>
                <a href="/safety">
                  <Icon name="shield" size={18} /> Safety centre <Icon name="arrow-right" size={16} />
                </a>
              </li>
              <li>
                <a href="/community-guidelines">
                  <Icon name="users" size={18} /> Community guidelines <Icon name="arrow-right" size={16} />
                </a>
              </li>
              <li>
                <a href="mailto:support@campusdrop.social">
                  <Icon name="flag" size={18} /> Report a concern <Icon name="arrow-right" size={16} />
                </a>
              </li>
            </ul>
            {email && (
              <p className="pcard__small">
                Signed in as <strong>{email}</strong>. Only you can see this.
              </p>
            )}
          </section>
        </div>
      </main>

      <EditDialog
        open={editing}
        profile={profile}
        onClose={() => setEditing(null)}
        onSaved={(p) => {
          setProfile(p);
          setEditing(null);
          setToast("Profile saved");
        }}
      />
      <AvatarPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSave={savePicture} currentUrl={profile.avatar} saving={picSaving} error={picError} />
      <div className={`toast${toast ? " is-on" : ""}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Icon name="check" size={16} /> {toast}
          </>
        )}
      </div>
    </>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`Profile ${pct}% complete`}>
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} className="ring__track" />
        <circle cx="40" cy="40" r={r} className="ring__fill" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span>
        <strong>{pct}%</strong>
        complete
      </span>
    </div>
  );
}

function EditDialog({ open, profile, onClose, onSaved }: { open: Editing; profile: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>(draftFromProfile(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setD(draftFromProfile(profile));
      setErrors({});
      setError("");
      if (!el.open) el.showModal();
      window.__lenis?.stop();
    } else if (el.open) el.close();
    return () => window.__lenis?.start();
  }, [open, profile]);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (open === "basics") {
      const v = validateBasics(d);
      setErrors(v);
      if (Object.keys(v).length) return;
    }
    if (open === "experience" && wantsConnection(d.lookingFor) && !d.connectionPreferenceGenders.length) {
      setErrors({ connectionPreferenceGenders: "Choose who you’re open to connection drops with, or pick friendship only." });
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile(open === "basics" ? basicsPatch(d) : experiencePatch(d));
      const p = await getProfile();
      if (p) onSaved(p);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError(err instanceof Error ? err.message : "Couldn’t save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} className="picker picker--edit" onClose={onClose} aria-labelledby="edit-title">
      <form className="picker__inner" onSubmit={submit} noValidate>
        <header className="picker__head">
          <div>
            <p className="eyebrow">Edit</p>
            <h2 id="edit-title" className="brush picker__title">
              {open === "experience" ? (
                <>
                  Your <em className="serif">drops.</em>
                </>
              ) : (
                <>
                  About <em className="serif">you.</em>
                </>
              )}
            </h2>
          </div>
          <button type="button" className="picker__close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="picker__scroll" data-lenis-prevent>
          {open === "experience" ? <ExperienceFields d={d} set={set} errors={errors} /> : <BasicsFields d={d} set={set} errors={errors} />}
        </div>
        {error && (
          <p className="notice notice--error" role="alert">
            <Icon name="alert" /> {error}
          </p>
        )}
        <footer className="picker__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? <span className="spinner" /> : <Icon name="check" />} {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
