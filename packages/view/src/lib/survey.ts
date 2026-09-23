// SPDX-License-Identifier: MIT
/**
 * The compiled record, and the one projection the renderer needs from it.
 *
 * This is where the view's logic lives, deliberately. There is no DOM in this package's test
 * suite — `vitest.config.ts` pulls in no jsdom — so anything that could be wrong without
 * looking wrong belongs in a pure function here, and the component stays a projection of it.
 */

/** One option in the set. The id is the service's own, or positional (`o0` upward). */
export interface Option {
  id: string;
  text: string;
}

export interface Survey {
  /** The survey taken. */
  id: string;
  /** One taking of it. */
  sessionId?: string;
  /** Which version of the survey this is — the file its options came from. */
  instance?: string;
  /** How a response answers it. */
  style?: "ranked-choice";
  title?: string;
  instructions: string;
  options: Option[];
  minChoices: number;
  maxChoices: number;
}

export interface SurveyResponse {
  /** Option ids, in priority order. The order IS the ranking. */
  choices: string[];
  /** One option that was not in the set. */
  writeIn?: string;
}

export interface Compiled {
  survey?: Survey;
  response?: SurveyResponse;
}

export interface Resolved {
  /** The chosen options, in the order the response put them. */
  chosen: Option[];
  /**
   * Selected ids naming nothing in the set.
   *
   * The compiler refuses these, so a program that came through it cannot produce any. The view
   * renders a model, though, not a compilation — a record assembled by hand or by an older
   * build can arrive here — and silently dropping an id would show a shorter ranking than the
   * one that was actually recorded.
   */
  unknown: string[];
  /** Ids that appear in the selection, for dimming them where the set is shown. */
  chosenIds: Set<string>;
}

/** Resolve a response's ids against the set it answers. Pure; the component renders the result. */
export function resolveChoices(
  survey: Survey | undefined,
  response: SurveyResponse | undefined,
): Resolved {
  const byId = new Map((survey?.options || []).map((i) => [i.id, i]));
  const chosen: Option[] = [];
  const unknown: string[] = [];

  for (const id of response?.choices || []) {
    const option = byId.get(id);
    if (option) chosen.push(option);
    else unknown.push(id);
  }

  return { chosen, unknown, chosenIds: new Set(chosen.map((i) => i.id)) };
}

/**
 * How the bounds read as a line of prose.
 *
 * Both bounds are always present in compiled output, so this states the range rather than
 * testing which of them was authored. The "any of N" case only arises when a survey explicitly
 * opens the whole set — the defaults (1, and 5 or one fewer than the set) never reach it.
 */
export function boundsLabel(survey: Survey): string {
  const n = survey.options.length;
  const { minChoices: min, maxChoices: max } = survey;
  if (min === max) return `Choose ${min} of ${n}`;
  if (min === 0 && max >= n) return `Choose any of ${n}`;
  if (min === 0) return `Choose up to ${max} of ${n}`;
  return `Choose ${min}–${max} of ${n}`;
}
