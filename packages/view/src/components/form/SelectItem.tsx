// SPDX-License-Identifier: MIT
/**
 * The sample of ideas, of which the participant picks the ones they prefer.
 *
 * Fully controlled: the component holds no selection of its own. The list it renders is the
 * participant's working value, so it cannot drift from what will be submitted.
 *
 * The ideas are NOT authored. They come from the session's adaptive sampler, which is why this
 * reads them off the frame rather than off the item.
 */
import type { ItemProps } from "./items";
import { Check, IdeaRow } from "./kit";

export function SelectItem({ item, frame, value, setValue }: ItemProps) {
  const ideas = frame?.ideas || [];
  const selected: string[] = Array.isArray(value) ? value : [];
  const max = item.maxChoices ?? ideas.length;

  if (!ideas.length) {
    return <p className="text-sm text-zinc-500">No ideas to show yet.</p>;
  }

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setValue(selected.filter((s) => s !== id));
      return;
    }
    // Hold the author's ceiling rather than silently dropping the click: at the limit the
    // oldest selection makes way. Refusing outright leaves the participant with no feedback.
    const next = [...selected, id];
    setValue(next.length > max ? next.slice(next.length - max) : next);
  };

  return (
    <div className="flex flex-col gap-2">
      {ideas.map((idea) => {
        const on = selected.includes(idea.id);
        return (
          <IdeaRow
            key={idea.id}
            text={idea.text}
            selected={on}
            badge={<Check on={on} />}
            onClick={() => toggle(idea.id)}
          />
        );
      })}
    </div>
  );
}
