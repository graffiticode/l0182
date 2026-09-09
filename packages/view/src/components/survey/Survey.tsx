// SPDX-License-Identifier: MIT
/**
 * L0182's view: the compiled record, rendered.
 *
 * It is READ-ONLY, and that is the design rather than a stage it is at. There is no survey flow
 * in this language — no screens, no steps, nothing to submit — because the code IS the
 * interface: a person edits the program in the console's editor, an agent edits it through
 * `update_item`, and both produce the same record. Adding a control here would create a third
 * way to answer that neither of them shares.
 *
 * The two columns are a before/after of one pass. Left is what was given — the set of ideas as
 * code generation inlined it. Right is what came back — the selection in priority order, and
 * the one new idea. Ideas that were chosen are dimmed on the left rather than removed, so the
 * column keeps its shape and what was passed over stays visible.
 *
 * Injected into the shared View from @graffiticode/l0000-view, which supplies `state.data` and
 * `state.errors`. It takes no `apply`: nothing here writes.
 */
import "../../index.css";
import type { FormProps, CompileError } from "@graffiticode/l0000-view";
import { boundsLabel, resolveSelection } from "../../lib/survey";
import type { Compiled } from "../../lib/survey";
import { Empty, ErrorList, IdeaRow, Panel } from "./kit";

export const Survey = ({ state }: FormProps) => {
  const compileErrors: CompileError[] = state.errors ?? [];
  const data: Compiled = state.data ?? {};
  const { survey, response } = data;

  if (compileErrors.length) {
    return (
      <div className="l0182-survey mx-auto max-w-4xl p-6">
        <ErrorList errors={compileErrors} />
      </div>
    );
  }

  if (!survey || !Array.isArray(survey.ideas)) {
    return (
      <div className="l0182-survey mx-auto max-w-4xl p-6">
        <Empty>Nothing to show yet — this program has not compiled a survey.</Empty>
      </div>
    );
  }

  const { chosen, unknown, chosenIds } = resolveSelection(survey, response);
  const answered = !!response;

  return (
    <div className="l0182-survey mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        {survey.title && <h1 className="text-lg font-semibold text-zinc-900">{survey.title}</h1>}
        <p className="text-xs uppercase tracking-wide text-zinc-400">{survey.name}</p>
        {/* Author's own words, between the title and the ideas. The bounds line that follows is
            derived from the choice bounds (see boundsLabel), so the two do not restate one
            another: this says what the survey is for, that says how many may be chosen. */}
        {survey.instructions && (
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">{survey.instructions}</p>
        )}
      </header>

      {/* One column on a phone. This is published as an embed and renders inside other people's
          pages, so the layout cannot assume it has the width for two. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel heading="The ideas" caption={boundsLabel(survey)}>
          <ul className="flex flex-col gap-2">
            {survey.ideas.map((idea) => (
              <li key={idea.id}>
                <IdeaRow text={idea.text} muted={chosenIds.has(idea.id)} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          heading="The response"
          caption={
            answered
              ? chosen.length
                ? `${chosen.length} chosen, most important first`
                : "Nothing chosen"
              : undefined
          }
        >
          {!answered ? (
            <Empty>No response yet.</Empty>
          ) : (
            <div className="flex flex-col gap-4">
              {chosen.length > 0 && (
                <ol className="flex flex-col gap-2">
                  {chosen.map((idea, i) => (
                    <li key={idea.id}>
                      <IdeaRow
                        text={idea.text}
                        accent
                        badge={
                          <span className="text-sm font-semibold tabular-nums text-green-700">
                            {i + 1}
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}

              {/* The compiler refuses these, so they only reach here on a record assembled
                  outside it. Named rather than dropped: a shorter ranking than the one recorded
                  is the kind of wrong that looks right. */}
              {unknown.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {unknown.length === 1 ? "This id names" : "These ids name"} nothing in the set:{" "}
                  {unknown.join(", ")}.
                </div>
              )}

              {response?.idea && (
                <div className="flex flex-col gap-1.5 border-t border-zinc-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    New idea — not in the set
                  </p>
                  <p className="text-[15px] leading-relaxed text-zinc-800">{response.idea}</p>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};
