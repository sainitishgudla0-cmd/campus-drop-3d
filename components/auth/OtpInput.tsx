"use client";
import { useRef } from "react";

/** Six-box one-time-code input: paste-aware, keyboard friendly, SMS/email autofill ready. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };

  return (
    <div className="otp" role="group" aria-label="6-digit verification code" aria-describedby={describedBy}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="otp__box"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={i === 0 ? 6 : 1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={d}
          disabled={disabled}
          autoFocus={i === 0}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) {
              // autofill / paste into a single box
              const clean = set(v);
              refs.current[Math.min(clean.length, 5)]?.focus();
              return;
            }
            const arr = digits.slice();
            arr[i] = v;
            set(arr.join(""));
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              const arr = digits.slice();
              arr[i - 1] = "";
              set(arr.join(""));
              refs.current[i - 1]?.focus();
              e.preventDefault();
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!/\d/.test(text)) return;
            e.preventDefault();
            const clean = set(text);
            refs.current[Math.min(clean.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
