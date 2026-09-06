// SPDX-License-Identifier: MIT
/**
 * One idea, in the participant's own words, added to the shared pool.
 *
 * The only uncontrolled item in the language. It drafts locally and reports on blur, because
 * an input reporting every keystroke would recompile the activity per character. The ref guard
 * is what stops a compile landing mid-sentence from resetting the box: the model hands down a
 * fresh object every render, so the committed value is compared as a string rather than by
 * identity.
 */
import { useEffect, useRef, useState } from "react";
import type { ItemProps } from "./items";

export function ContributeItem({ item, value, setValue }: ItemProps) {
  const committed = typeof value === "string" ? value : "";
  const seen = useRef(committed);
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    if (committed !== seen.current) {
      seen.current = committed;
      setDraft(committed);
    }
  }, [committed]);

  const commit = () => {
    if (draft === committed) return;
    seen.current = draft;
    setValue(draft);
  };

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      rows={3}
      aria-label={item.prompt || "Your idea"}
      className="w-full rounded-md border border-zinc-300 p-3 text-[15px] text-zinc-900 focus:border-green-600 focus:outline-none"
    />
  );
}
