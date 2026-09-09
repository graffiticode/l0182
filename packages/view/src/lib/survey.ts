// SPDX-License-Identifier: MIT
/**
 * The compiled record, and the one projection the renderer needs from it.
 *
 * This is where the view's logic lives, deliberately. There is no DOM in this package's test
 * suite — `vitest.config.ts` pulls in no jsdom — so anything that could be wrong without
 * looking wrong belongs in a pure function here, and the component stays a projection of it.
 */

/** One idea in the set. The id is the service's own, or positional (`i0` upward). */
export interface Idea {
  id: string;
  text: string;
}

export interface Survey {
  name: string;
  title?: string;
  instructions: string;
  ideas: Idea[];
  minChoices: number;
  maxChoices: number;
}

export interface SurveyResponse {
  /** Idea ids, in priority order. The order IS the ranking. */
  selection: string[];
  /** One idea that was not in the set. */
  idea?: string;
}

export interface Compiled {
  survey?: Survey;
  response?: SurveyResponse;
}

export interface Resolved {
  /** The chosen ideas, in the order the response put them. */
  chosen: Idea[];
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
export function resolveSelection(
  survey: Survey | undefined,
  response: SurveyResponse | undefined,
): Resolved {
  const byId = new Map((survey?.ideas || []).map((i) => [i.id, i]));
  const chosen: Idea[] = [];
  const unknown: string[] = [];

  for (const id of response?.selection || []) {
    const idea = byId.get(id);
    if (idea) chosen.push(idea);
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
  const n = survey.ideas.length;
  const { minChoices: min, maxChoices: max } = survey;
  if (min === max) return `Choose ${min} of ${n}`;
  if (min === 0 && max >= n) return `Choose any of ${n}`;
  if (min === 0) return `Choose up to ${max} of ${n}`;
  return `Choose ${min}–${max} of ${n}`;
}
