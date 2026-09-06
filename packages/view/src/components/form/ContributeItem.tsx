// SPDX-License-Identifier: MIT
/**
 * One idea, in the participant's own words, added to the shared pool.
 *
 * Fully controlled, like every other item here.
 *
 * L0180's text inputs draft locally and commit on blur, because there `respond` writes to the
 * model and every keystroke would recompile the item. That reasoning does not carry over: this
 * item's `value` is local React state owned by `Form`, and only advancing sends a `response`.
 * So the deferral bought nothing — and it cost the Skip/Next flip, which stayed on "Skip" until
 * the participant happened to click away from the box.
 */
import type { ItemProps } from "./items";

export function ContributeItem({ item, value, setValue }: ItemProps) {
  return (
    <textarea
      value={typeof value === "string" ? value : ""}
      onChange={(e) => setValue(e.target.value)}
      rows={3}
      aria-label={item.prompt || "Your idea"}
      className="w-full rounded-md border border-zinc-300 p-3 text-[15px] text-zinc-900 focus:border-green-600 focus:outline-none"
    />
  );
}
