"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { requestUniversity, type University } from "@/lib/api";
import { domainHint, searchUniversities, uniPlace, uniTitle } from "@/lib/universities";

/** Accessible combobox (ARIA 1.2 pattern) over the platform's live university list. */
export function CampusPicker({
  universities,
  selected,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  universities: University[];
  selected: University | null;
  onSelect: (u: University | null) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => searchUniversities(universities, q, 8), [universities, q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (selected) {
    const hint = domainHint(selected);
    return (
      <div className="campus-card">
        <span className="campus-card__icon">
          <Icon name="school" size={22} />
        </span>
        <div className="campus-card__body">
          <p className="campus-card__name">{uniTitle(selected)}</p>
          <p className="campus-card__meta">
            {uniPlace(selected)}
            {hint ? <> · use {hint}</> : <> · campus or personal email</>}
          </p>
        </div>
        <button type="button" className="link" onClick={() => onSelect(null)}>
          Change
        </button>
      </div>
    );
  }

  const choose = (u: University) => {
    onSelect(u);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="combo">
      <label className="field__label" htmlFor={`${id}-input`}>
        Your university
      </label>
      <div className="input-icon">
        <Icon name="search" />
        <input
          id={`${id}-input`}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
          placeholder={loading ? "Loading campuses…" : "Search by university, campus or city"}
          value={q}
          disabled={loading && !universities.length}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {error && (
        <p className="field__error">
          <Icon name="alert" /> {error}{" "}
          <button type="button" className="link" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {open && !loading && (
        <ul id={`${id}-list`} ref={listRef} className="combo__list" role="listbox" aria-label="Universities" data-lenis-prevent>
          {results.length === 0 ? (
            <li className="combo__empty" role="presentation">
              No campus matches “{q}”. You can request it below.
            </li>
          ) : (
            results.map((u, i) => (
              <li
                key={u.id}
                id={`${id}-opt-${i}`}
                data-i={i}
                role="option"
                aria-selected={i === active}
                className={`combo__opt${i === active ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(u)}
              >
                <span className="combo__name">{uniTitle(u)}</span>
                <span className="combo__place">{uniPlace(u)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function UniversityRequestForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ universityName: "", city: "", state: "", country: "India", domain: "", email: defaultEmail, note: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!open)
    return (
      <button type="button" className="request-toggle" onClick={() => setOpen(true)} aria-expanded={false}>
        <Icon name="plus" size={16} /> Can’t find your university? Request it
      </button>
    );

  if (state === "sent")
    return (
      <p className="notice notice--ok">
        <Icon name="check" /> Request sent. The CampusDrop team will review it and activate campuses as they roll out.
      </p>
    );

  return (
    <form
      className="request-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setState("sending");
        try {
          await requestUniversity(form);
          setState("sent");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not submit this request.");
          setState("idle");
        }
      }}
    >
      <p className="request-form__title">Request your university</p>
      <div className="grid-2">
        <input className="input input--sm" placeholder="University name" required value={form.universityName} onChange={set("universityName")} aria-label="University name" />
        <input className="input input--sm" placeholder="City" required value={form.city} onChange={set("city")} aria-label="City" />
        <input className="input input--sm" placeholder="State" value={form.state} onChange={set("state")} aria-label="State" />
        <input className="input input--sm" placeholder="Country" value={form.country} onChange={set("country")} aria-label="Country" />
        <input className="input input--sm" placeholder="Official email domain (e.g. univ.edu)" value={form.domain} onChange={set("domain")} aria-label="Official email domain" />
        <input className="input input--sm" type="email" placeholder="Your email" value={form.email} onChange={set("email")} aria-label="Your email" />
      </div>
      <textarea className="textarea" placeholder="Anything the team should know?" value={form.note} onChange={set("note")} aria-label="Note" rows={3} />
      {error && (
        <p className="field__error">
          <Icon name="alert" /> {error}
        </p>
      )}
      <div className="request-form__actions">
        <button type="button" className="link" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn btn--sm" type="submit" disabled={state === "sending"}>
          {state === "sending" ? <span className="spinner" /> : null} Send request
        </button>
      </div>
    </form>
  );
}
