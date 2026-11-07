"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AVATARS, avatarSrc, isIllustratedAvatar } from "@/lib/avatars";
import { CONTRACT } from "@/lib/contract";
import { validateImageFile } from "@/lib/image";

export type AvatarChoice = { kind: "avatar"; id: string } | { kind: "photo"; file: File };

/**
 * Choose an illustrated avatar from the CampusDrop collection, or upload your own photo.
 * Uses the native <dialog> element (built-in focus trap, Esc to close, inert background).
 */
export function AvatarPicker({
  open,
  onClose,
  onSave,
  currentUrl,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: AvatarChoice) => void;
  currentUrl?: string;
  saving?: boolean;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"avatars" | "photo">("avatars");
    const [selected, setSelected] = useState<string>(() => currentUrl?.match(/\/avatars\/(cd-[ab]\d{2})\.webp/)?.[1] ?? AVATARS[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      window.__lenis?.stop();
    } else if (!open && d.open) d.close();
    return () => window.__lenis?.start();
  }, [open]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const list = AVATARS;
  const canSave = tab === "avatars" ? !!selected : !!file;

  return (
    <dialog ref={ref} className="picker" onClose={onClose} aria-labelledby="picker-title" onClick={(e) => e.target === ref.current && onClose()}>
      <div className="picker__inner">
        <header className="picker__head">
          <div>
            <p className="eyebrow">Profile picture</p>
            <h2 id="picker-title" className="brush picker__title">
              Pick your <em className="serif">look.</em>
            </h2>
          </div>
          <button className="picker__close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="seg" role="tablist" aria-label="Picture type">
          <button role="tab" aria-selected={tab === "avatars"} className="seg__btn" onClick={() => setTab("avatars")}>
            <Icon name="spark" size={16} /> Illustrated avatars
          </button>
          <button role="tab" aria-selected={tab === "photo"} className="seg__btn" onClick={() => setTab("photo")}>
            <Icon name="image" size={16} /> Upload a photo
          </button>
        </div>

        {tab === "avatars" ? (
          <div className="picker__body">
            <div className="picker__preview">
              <div className="picker__big">
                <img src={avatarSrc(selected)} alt="" width={320} height={320} />
              </div>
              <span className="badge-illustrative">Illustrated avatar</span>
              <p className="field__hint">
                AI-generated illustrations of fictional people, made for CampusDrop. Use one if you’d rather not share a photo. You can change it any time.
              </p>
            </div>
            <div className="picker__choose">
              <div className="picker__grid" role="radiogroup" aria-label="Avatars" data-lenis-prevent>
                {list.map((a, i) => (
                  <button
                    key={a.id}
                    role="radio"
                    aria-checked={selected === a.id}
                    aria-label={`Illustrated avatar ${i + 1}`}
                    className="picker__opt"
                    style={{ background: a.bg }}
                    onClick={() => setSelected(a.id)}
                  >
                    <img src={avatarSrc(a.id)} alt="" width={160} height={160} loading="lazy" />
                    {selected === a.id && (
                      <span className="picker__tick">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="picker__body picker__body--photo">
            <button type="button" className={`dropzone dropzone--round${preview ? " has-file" : ""}`} onClick={() => fileRef.current?.click()}>
              {preview ? (
                <img src={preview} alt="Preview of your photo" />
              ) : (
                <span className="dropzone__empty">
                  <span className="dropzone__icon">
                    <Icon name="upload" size={28} />
                  </span>
                  <strong>Choose a photo</strong>
                  <span>JPG, PNG or WebP · location data is removed before upload</span>
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload a profile photo"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const problem = validateImageFile(f, CONTRACT.idCard.acceptedTypes, CONTRACT.idCard.maxBytes);
                setFileError(problem);
                if (problem) return;
                if (preview) URL.revokeObjectURL(preview);
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
            <ul className="ticks">
              <li>A clear photo of you, on your own.</li>
              <li>Your photo is added to your profile; you can remove it later.</li>
              {currentUrl && !isIllustratedAvatar(currentUrl) && <li>Your current photo stays until you remove it from your profile.</li>}
            </ul>
            {fileError && (
              <p className="field__error">
                <Icon name="alert" /> {fileError}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="notice notice--warn" role="alert">
            <Icon name="info" /> {error}
          </p>
        )}

        <footer className="picker__foot">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={!canSave || saving}
            onClick={() => (tab === "avatars" ? onSave({ kind: "avatar", id: selected }) : file && onSave({ kind: "photo", file }))}
          >
            {saving ? <span className="spinner" /> : <Icon name="check" />}
            {saving ? "Saving…" : tab === "avatars" ? "Use this avatar" : "Use this photo"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
