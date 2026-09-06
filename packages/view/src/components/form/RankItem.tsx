// SPDX-License-Identifier: MIT
/**
 * The ideas the participant selected, put into order of preference.
 *
 * Drag is the advertised gesture, but the up/down buttons are the accessible path rather than
 * a fallback: a survey taken by the general public on a phone needs a control that works
 * without a pointer, and reordering by keyboard is otherwise impossible.
 *
 * Carries no list of its own — it orders whatever the preceding `select` gathered, which is
 * why the compiler refuses a `rank` without one.
 */
import { useState } from "react";
import type { ItemProps } from "./items";
import { IdeaRow, cx } from "./kit";

/** Move (not swap) the entry at `from` to `to`. Swapping reorders the wrong element. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function RankItem({ frame, value, setValue }: ItemProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const order: string[] = Array.isArray(value) ? value : [];
  const byId = new Map((frame?.selected || []).map((i) => [i.id, i.text]));

  if (!order.length) {
    return <p className="text-sm text-zinc-500">Nothing selected to rank.</p>;
  }

  const shift = (from: number, to: number) => setValue(move(order, from, to));

  return (
    <ol className="flex flex-col gap-2">
      {order.map((id, i) => (
        <li
          key={id}
          draggable
          onDragStart={() => setDragging(i)}
          onDragEnd={() => setDragging(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null) shift(dragging, i);
            setDragging(null);
          }}
          className={cx("flex items-center gap-2", dragging === i && "opacity-50")}
        >
          <div className="min-w-0 flex-1">
            <IdeaRow
              text={byId.get(id) ?? id}
              selected
              badge={
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
              }
            />
          </div>
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              aria-label={`Move "${byId.get(id) ?? id}" up`}
              disabled={i === 0}
              onClick={() => shift(i, i - 1)}
              className="px-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label={`Move "${byId.get(id) ?? id}" down`}
              disabled={i === order.length - 1}
              onClick={() => shift(i, i + 1)}
              className="px-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
            >
              ▼
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
