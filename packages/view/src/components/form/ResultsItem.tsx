// SPDX-License-Identifier: MIT
/**
 * The group's current ranking.
 *
 * Computed by the session's engine at delivery over the population the activity's `audience`
 * names, and truncated to `limit`. Nothing here ranks anything — this renders what the server
 * returned.
 */
import type { ItemProps } from "./items";
import { IdeaRow } from "./kit";

export function ResultsItem({ item, frame }: ItemProps) {
  const results = (frame?.results || []).slice(0, item.limit ?? 10);

  if (!results.length) {
    return <p className="text-sm text-zinc-500">No results yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {item.showParticipants && typeof frame?.participants === "number" && (
        <p className="text-sm text-zinc-500">
          {frame.participants} participant{frame.participants === 1 ? "" : "s"}
        </p>
      )}
      <ol className="flex flex-col gap-2">
        {results.map((idea, i) => (
          <li key={idea.id}>
            <IdeaRow
              text={idea.text}
              // Inside the row, not under it: a score rendered as a sibling sat outside the
              // border and read as unrelated to the idea above it.
              sub={
                item.showScores && typeof idea.score === "number" ? `Score: ${idea.score}%` : undefined
              }
              badge={<span className="text-sm font-semibold text-green-700">{i + 1}</span>}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
