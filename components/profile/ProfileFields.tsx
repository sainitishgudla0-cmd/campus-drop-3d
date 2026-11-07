"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CONTRACT } from "@/lib/contract";
import { INTEREST_SUGGESTIONS, YEAR_LABELS, type Profile, type ProfilePatch } from "@/lib/profile";

export interface Draft {
  name: string;
  age: string;
  program: string;
  year: string;
  hometown: string;
  bio: string;
  interests: string[];
  gender: string;
  lookingFor: string;
  connectionPreferenceGenders: string[];
}

export const BIO_MAX = 280;
export const INTERESTS_MIN = 3;
export const INTERESTS_MAX = 10;

export function draftFromProfile(p: Profile | null): Draft {
  return {
    name: p?.name ?? "",
    age: p?.age ? String(p.age) : "",
    program: p?.program ?? "",
    year: p?.year ? String(p.year) : "",
    hometown: p?.hometown ?? "",
    bio: p?.bio ?? "",
    interests: p?.interests ?? [],
    gender: p?.gender ?? "",
    lookingFor: p?.lookingFor ?? CONTRACT.lookingFor[0].value,
    connectionPreferenceGenders: p?.connectionPreferenceGenders ?? [],
  };
}

export function validateBasics(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 2) e.name = "Add the name you go by on campus.";
  const age = Number(d.age);
  if (!d.age) e.age = "Add your age.";
  else if (!Number.isInteger(age) || age < 18) e.age = "CampusDrop is only for students aged 18 and over.";
  else if (age > 99) e.age = "Enter a valid age.";
  if (!d.program.trim()) e.program = "Add your course or programme.";
  if (!d.year) e.year = "Choose your year.";
  if (d.interests.length < INTERESTS_MIN) e.interests = `Pick at least ${INTERESTS_MIN} interests. They power your drops.`;
  if (d.bio.length > BIO_MAX) e.bio = `Keep it under ${BIO_MAX} characters.`;
  return e;
}

export const basicsPatch = (d: Draft): ProfilePatch => ({
  name: d.name.trim(),
  age: Number(d.age),
  program: d.program.trim(),
  year: Number(d.year),
  hometown: d.hometown.trim(),
  bio: d.bio.trim(),
  interests: d.interests,
});

export const wantsConnection = (lookingFor: string) => lookingFor !== CONTRACT.lookingFor[0].value;

export const experiencePatch = (d: Draft): ProfilePatch => ({
  lookingFor: d.lookingFor,
  ...(d.gender ? { gender: d.gender } : {}),
  ...(wantsConnection(d.lookingFor) ? { connectionPreferenceGenders: d.connectionPreferenceGenders } : {}),
});

function Err({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <span id={id} className="field__error">
      <Icon name="alert" /> {msg}
    </span>
  );
}

export function BasicsFields({ d, set, errors }: { d: Draft; set: (patch: Partial<Draft>) => void; errors: Record<string, string> }) {
  return (
    <div className="form-grid">
      <label className="field span-2">
        <span className="field__label">Name</span>
        <input className="input" value={d.name} autoComplete="name" onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name || undefined} aria-describedby="e-name" placeholder="What friends call you" />
        <Err id="e-name" msg={errors.name} />
      </label>
      <label className="field">
        <span className="field__label">Age</span>
        <input className="input" inputMode="numeric" value={d.age} onChange={(e) => set({ age: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-invalid={!!errors.age || undefined} aria-describedby="e-age" placeholder="18+" />
        <Err id="e-age" msg={errors.age} />
      </label>
      <label className="field">
        <span className="field__label">Year</span>
        <select className="select input" value={d.year} onChange={(e) => set({ year: e.target.value })} aria-invalid={!!errors.year || undefined} aria-describedby="e-year">
          <option value="">Choose…</option>
          {YEAR_LABELS.map((y, i) => (
            <option key={y} value={i + 1}>
              {y}
            </option>
          ))}
        </select>
        <Err id="e-year" msg={errors.year} />
      </label>
      <label className="field span-2">
        <span className="field__label">Course / programme</span>
        <input className="input" value={d.program} onChange={(e) => set({ program: e.target.value })} aria-invalid={!!errors.program || undefined} aria-describedby="e-program" placeholder="e.g. B.Tech Computer Science" />
        <Err id="e-program" msg={errors.program} />
      </label>
      <label className="field span-2">
        <span className="field__label">
          Hometown <span className="meta">Optional</span>
        </span>
        <input className="input" value={d.hometown} onChange={(e) => set({ hometown: e.target.value })} placeholder="Where you’re from" />
      </label>
      <div className="field span-2">
        <span className="field__label" id="interests-label">
          Interests & hobbies <span className="meta">{d.interests.length}/{INTERESTS_MAX}</span>
        </span>
        <InterestPicker value={d.interests} onChange={(interests) => set({ interests })} labelledBy="interests-label" />
        <Err id="e-interests" msg={errors.interests} />
      </div>
      <label className="field span-2">
        <span className="field__label">
          Short intro <span className="meta">{d.bio.length}/{BIO_MAX}</span>
        </span>
        <textarea
          className="textarea"
          value={d.bio}
          maxLength={BIO_MAX + 40}
          onChange={(e) => set({ bio: e.target.value })}
          aria-invalid={!!errors.bio || undefined}
          aria-describedby="e-bio"
          placeholder="The thing you’d talk about for an hour, your ideal Sunday, the club you’re starting…"
        />
        <Err id="e-bio" msg={errors.bio} />
      </label>
    </div>
  );
}

export function InterestPicker({ value, onChange, labelledBy }: { value: string[]; onChange: (v: string[]) => void; labelledBy: string }) {
  const [custom, setCustom] = useState("");
  const toggle = (t: string) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));
    else if (value.length < INTERESTS_MAX) onChange([...value, t]);
  };
  const extra = value.filter((v) => !INTEREST_SUGGESTIONS.includes(v));
  const add = () => {
    const t = custom.trim().replace(/\s+/g, " ").slice(0, 32);
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase()) && value.length < INTERESTS_MAX) onChange([...value, t]);
    setCustom("");
  };
  return (
    <div className="interests" role="group" aria-labelledby={labelledBy}>
      <div className="interests__chips">
        {[...INTEREST_SUGGESTIONS, ...extra].map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={value.includes(t)} onClick={() => toggle(t)} disabled={!value.includes(t) && value.length >= INTERESTS_MAX}>
            {value.includes(t) && <Icon name="check" />}
            {t}
          </button>
        ))}
      </div>
      <div className="interests__add">
        <input
          className="input input--sm"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add your own"
          aria-label="Add your own interest"
        />
        <button type="button" className="btn btn--sm btn--ghost" onClick={add} disabled={!custom.trim() || value.length >= INTERESTS_MAX}>
          <Icon name="plus" /> Add
        </button>
      </div>
    </div>
  );
}

export function ExperienceFields({ d, set, errors }: { d: Draft; set: (patch: Partial<Draft>) => void; errors: Record<string, string> }) {
  const connect = wantsConnection(d.lookingFor);
  return (
    <div className="exp">
      <div className="exp__options" role="radiogroup" aria-label="What would you like from CampusDrop?">
        {CONTRACT.lookingFor.map((o, i) => (
          <button key={o.value} type="button" role="radio" aria-checked={d.lookingFor === o.value} className={`exp-card exp-card--${i}`} onClick={() => set({ lookingFor: o.value })}>
            <span className="exp-card__check" aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            <span className="exp-card__title">{o.label}</span>
            <span className="exp-card__hint">{o.hint}</span>
            {i === 0 && <span className="exp-card__tag meta">Recommended</span>}
          </button>
        ))}
      </div>
      {errors.lookingFor && <Err id="e-lf" msg={errors.lookingFor} />}

      <div className="form-grid">
        <label className="field">
          <span className="field__label">
            Your gender <span className="meta">{connect ? "Used for connection drops" : "Optional"}</span>
          </span>
          <select className="select input" value={d.gender} onChange={(e) => set({ gender: e.target.value })} aria-invalid={!!errors.gender || undefined}>
            <option value="">Prefer not to say</option>
            {CONTRACT.genders.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <Err id="e-gender" msg={errors.gender} />
        </label>

        {connect && (
          <div className="field">
            <span className="field__label" id="pref-label">
              Open to connection drops with
            </span>
            <div className="interests__chips" role="group" aria-labelledby="pref-label">
              {CONTRACT.genders.map((g) => {
                const on = d.connectionPreferenceGenders.includes(g.value);
                return (
                  <button
                    key={g.value}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onClick={() => set({ connectionPreferenceGenders: on ? d.connectionPreferenceGenders.filter((x) => x !== g.value) : [...d.connectionPreferenceGenders, g.value] })}
                  >
                    {on && <Icon name="check" />}
                    {g.label}
                  </button>
                );
              })}
            </div>
            <Err id="e-pref" msg={errors.connectionPreferenceGenders} />
          </div>
        )}
      </div>

      <p className="notice">
        <Icon name="shield" />
        <span>
          Connection drops are always optional. Friendship stays the default, you choose when to chat, and you can change this any time from your profile.
        </span>
      </p>
    </div>
  );
}
