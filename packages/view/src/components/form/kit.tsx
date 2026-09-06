// SPDX-License-Identifier: MIT
/** The shared furniture every item is built from: one card, one shell, one nav bar. */
import type { ReactNode } from "react";

export function cx(...c: unknown[]): string {
  return c.filter(Boolean).join(" ");
}

export function ErrorList({ errors }: { errors: { message: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {errors.map((e, i) => (
        <div
          key={i}
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {e.message}
        </div>
      ))}
    </div>
  );
}

/** Title, prose, hint — the top of every item, so the three never drift apart. */
export function Stem({
  title,
  prompt,
  hint,
}: {
  title?: string;
  prompt?: string;
  hint?: string;
}) {
  if (!title && !prompt && !hint) return null;
  return (
    <div className="flex flex-col gap-3">
      {title && <h1 className="text-xl font-semibold leading-tight text-zinc-900">{title}</h1>}
      {prompt && <p className="text-[15px] leading-relaxed text-zinc-700">{prompt}</p>}
      {hint && <p className="text-sm text-zinc-500">{hint}</p>}
    </div>
  );
}

/**
 * A selectable row.
 *
 * Rendered as a button rather than a styled div so it is reachable by keyboard and announced
 * as a control, which a survey taken by the general public actually needs.
 */
export function IdeaRow({
  text,
  sub,
  selected,
  badge,
  onClick,
  disabled,
}: {
  text: string;
  /** A second line under the text, inside the row — a score, on the results item. */
  sub?: ReactNode;
  selected?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, disabled, "aria-pressed": !!selected } : {})}
      className={cx(
        "flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-[15px]",
        onClick && "hover:border-zinc-400 disabled:opacity-50",
        selected ? "border-green-600 bg-green-50 text-green-900" : "border-zinc-200 bg-white",
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{badge}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span>{text}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </span>
    </Tag>
  );
}

/** The check-circle a `select` row carries. */
export function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cx(
        "flex h-5 w-5 items-center justify-center rounded-full border text-white",
        on ? "border-green-600 bg-green-600" : "border-zinc-300",
      )}
      aria-hidden="true"
    >
      {on && (
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M7.6 13.3 4.3 10l1.1-1.1 2.2 2.2 5-5L13.7 7z" />
        </svg>
      )}
    </span>
  );
}

export function Nav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  if (!onBack && !onNext) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-40"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
