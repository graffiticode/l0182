// SPDX-License-Identifier: MIT
/**
 * L0182's Form: the survey player.
 *
 * Injected into the shared View from @graffiticode/l0000-view, which supplies `state.data`,
 * `state.errors` and `state.apply`, and owns the URL params, the parent-window messaging and
 * the recompile loop.
 *
 * Two actions, and the split is the whole design:
 *
 *   `navigate`  merges into `response` and does NOT recompile. Moving between items is not an
 *               answer, and a compile round trip per screen would be both slow and wrong.
 *   `response`  an actual answer. Recompiles, which is what persists it as an upstream L0000
 *               object and what makes it survive a reload.
 *
 * That is `submission "individual"` — one submit per ANSWERED item, which is exactly what the
 * MCP tool sequence does too. Same instrument, same steps, whichever client you arrive on.
 */
import "../../index.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormProps, CompileError } from "@graffiticode/l0000-view";
import { answerSurvey, openSurvey } from "../../lib/service";
import type { Frame } from "../../lib/service";
import { KINDS, knownItems } from "./items";
import { ErrorList, Nav, Stem } from "./kit";

export const Form = ({ state }: FormProps) => {
  const compileErrors: CompileError[] = state.errors ?? [];
  const data = state.data ?? {};
  const activity = data.activity;
  const items: any[] = Array.isArray(activity?.items) ? activity.items : [];
  const response = data.response ?? {};

  const [frame, setFrame] = useState<Frame | null>(null);
  const [value, setValue] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const cursor = typeof response.item === "number" ? response.item : 0;
  const item = items[cursor];
  const kind = item ? KINDS[item.type] : undefined;

  const apply = state.apply;
  const session = activity?.session;
  const participants = activity?.participants;
  const participation = response.participation;

  // The compiled sequence, as the backend needs it. The proxy never sees the activity, so
  // without this a backend that does not already know the session cannot bound the cursor or
  // size the sample. Memoised on the ids so a recompile does not look like a different activity.
  const refs = useMemo(
    () => items.map((i) => ({ id: i.id, type: i.type, ...(i.sample !== undefined ? { sample: i.sample } : {}) })),
    [items.map((i) => `${i.id}:${i.type}:${i.sample ?? ""}`).join("|")],
  );

  // Open (or resume) the participation once the activity has compiled. `opened` guards against
  // StrictMode's double-mount and against a recompile re-running the effect, either of which
  // would otherwise start a second participation for the same person.
  const opened = useRef(false);
  useEffect(() => {
    if (!activity || opened.current) return;
    opened.current = true;
    let cancelled = false;
    (async () => {
      try {
        const next = await openSurvey({ session, participation, participants, items: refs });
        if (cancelled) return;
        setFrame(next);
        apply({ type: "navigate", args: { participation: next.participation, item: next.item } });
      } catch (e: any) {
        if (!cancelled) setFailure(String(e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activity, session, participation, participants, refs, apply]);

  // Re-seed the working value whenever the participant lands on a different item, from what
  // the server sent and what they answered here before — so going back shows their own answer
  // rather than an empty item.
  const seededFor = useRef<number | null>(null);
  useEffect(() => {
    if (!kind || seededFor.current === cursor) return;
    seededFor.current = cursor;
    setValue(kind.initial(item, frame, response.answers?.[String(cursor)]));
  }, [kind, cursor, item, frame, response.answers]);

  const advance = useCallback(async () => {
    if (!item || !kind || busy) return;
    setFailure(null);
    const answer = kind.answer(item, value);

    // A content item captures nothing, so it never submits — it just moves the cursor.
    if (!answer) {
      apply({ type: "navigate", args: { item: Math.min(cursor + 1, items.length - 1) } });
      return;
    }

    // The last item of the activity: submitting it ends the run. Saying so is the difference
    // between a control that finishes and one that appears to do nothing.
    const last = cursor >= items.length - 1;

    setBusy(true);
    try {
      const next = await answerSurvey({ session, participation, participants, items: refs, item: cursor, answer });
      setFrame(next);
      // The answer is reported as `response` because that is one of the two action types the
      // shared View recompiles on — so capture needs no transport of its own, and the answer
      // comes back down attached to the activity.
      apply({
        type: "response",
        args: {
          response: {
            ...response,
            participation: next.participation,
            item: next.item,
            answers: { ...(response.answers || {}), [String(cursor)]: answer },
          },
        },
      });
      if (last) setFinished(true);
    } catch (e: any) {
      setFailure(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }, [item, kind, busy, value, cursor, items.length, session, participation, participants, refs, response, apply]);

  const back = useCallback(() => {
    apply({ type: "navigate", args: { item: Math.max(cursor - 1, 0) } });
  }, [cursor, apply]);

  const body = () => {
    if (compileErrors.length > 0) return <ErrorList errors={compileErrors} />;
    if (!activity) {
      // Nothing compiled yet, or a program that produced something other than an activity.
      return <pre className="text-xs text-zinc-500">{JSON.stringify(data, null, 2)}</pre>;
    }
    if (!item) return <p className="text-sm text-zinc-500">This activity has no items.</p>;
    if (!kind) {
      return (
        <ErrorList
          errors={[
            {
              message: `This build cannot render a "${item.type}" item. It knows: ${knownItems().join(", ")}.`,
            },
          ]}
        />
      );
    }

    const { Body } = kind;
    const canAdvance = kind.ready(item, value);
    const isLast = cursor >= items.length - 1;

    // No forward control when there is nowhere to go. A content item at the end of the activity
    // used to render a "Next" that clamped the cursor to itself and did nothing — the reading
    // of which is that the survey is broken, not that it is over.
    const label = finished || (isLast && !kind.captures) ? "" : isLast ? "Done" : kind.label(item, value);
    // `linear` navigation is the author saying a participant may not revisit an answer.
    const canGoBack = activity.navigation === "nonlinear" && cursor > 0;

    return (
      <div className="flex flex-col gap-5">
        {frame?.mock && (
          <span className="self-start rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            Sample data
          </span>
        )}
        <Stem title={activity.title} prompt={item.prompt} hint={item.hint} />
        <Body item={item} frame={frame} value={value} setValue={setValue} />
        {failure && <ErrorList errors={[{ message: failure }]} />}
        {finished && (
          <p className="text-sm text-zinc-500">Thank you — your response has been recorded.</p>
        )}
        <Nav
          onBack={canGoBack ? back : undefined}
          onNext={label ? advance : undefined}
          nextLabel={busy ? "…" : label}
          nextDisabled={busy || !canAdvance}
        />
      </div>
    );
  };

  return (
    <div className="l0182-survey">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-md border border-zinc-200 bg-white p-6 font-sans text-zinc-900">
        {body()}
      </div>
    </div>
  );
};
