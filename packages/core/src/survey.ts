// SPDX-License-Identifier: MIT
/**
 * The survey record, and every error message it produces.
 *
 * A survey is a named set of ideas and — optionally — one response to it: the ideas chosen, in
 * priority order, plus one new idea that was not in the set. That is the whole model. There is
 * no flow here and no player anywhere in this repo; the code IS the interface, written by a
 * person in the console's editor or by an agent through `update_item`, and the view only
 * renders what the code says.
 *
 * Because there is no player, nothing at delivery time can hold a response inside the authored
 * bounds. **The compiler is the only enforcement there is**, which is why the rules below are
 * more thorough than a form-backed language would need, and why every message names the fix
 * rather than merely reporting the fault: the reader is a code-generating model that will read
 * it and retry.
 *
 * All validation runs in the TRANSFORMER. `Checker.LIST` visits only `elts[0]`, so a rule
 * written as a Checker method would fire on the first attribute and nowhere else.
 */
import { Idea, assertKnownAttributes, mergeAttributes } from "./attributes.js";

export interface SurveyResponse {
  /** Idea ids, in priority order. The order IS the ranking. */
  selection: string[];
  /** One idea that was not in the set. Absent when none was contributed. */
  idea?: string;
}

export interface Survey {
  name: string;
  title?: string;
  ideas: Idea[];
  minChoices: number;
  maxChoices: number;
}

/** What the compiler emits. `response` is absent until something answers. */
export interface Compiled {
  survey: Survey;
  response?: SurveyResponse;
}

/**
 * Give every idea an id.
 *
 * An entry that named its own id keeps it — that id came from the service the set was fetched
 * from, and a `selection` of positional ids would mean nothing back there. An entry that did
 * not is numbered by position, `i0` upward, which is derived rather than authored so that
 * nothing can be selected under a name the set does not offer.
 */
function normaliseIdeas(raw: any[]): Idea[] {
  return raw.map((entry, i) =>
    typeof entry === "string"
      ? { id: `i${i}`, text: entry.trim() }
      : { id: typeof entry.id === "string" ? entry.id : `i${i}`, text: String(entry.text).trim() },
  );
}

/** Reject a set that cannot support a meaningful choice, or that cannot be selected from unambiguously. */
function assertIdeas(ideas: Idea[]): void {
  if (ideas.length < 2) {
    throw new Error(
      `survey: \`ideas\` has ${ideas.length === 1 ? "only one idea" : "no ideas"}, so there is nothing ` +
        "to choose between. A survey needs at least two.",
    );
  }
  const byText = new Map<string, number>();
  const byId = new Map<string, number>();
  ideas.forEach((idea, i) => {
    const seenText = byText.get(idea.text);
    if (seenText !== undefined) {
      throw new Error(
        `survey: ideas ${seenText + 1} and ${i + 1} are both ${JSON.stringify(idea.text)}. ` +
          "Each idea must be distinct — a duplicate splits the choice between two entries that mean the same thing.",
      );
    }
    byText.set(idea.text, i);
    const seenId = byId.get(idea.id);
    if (seenId !== undefined) {
      throw new Error(
        `survey: ideas ${seenId + 1} and ${i + 1} share the id ${JSON.stringify(idea.id)}, so a ` +
          "selection naming it is ambiguous. Give each idea its own id, or drop the ids and let them be numbered by position.",
      );
    }
    byId.set(idea.id, i);
  });
}

/** Resolve and check the bounds a response must satisfy. */
function resolveBounds(
  attrs: Record<string, any>,
  ideas: Idea[],
): { minChoices: number; maxChoices: number } {
  const minChoices = attrs.minChoices !== undefined ? attrs.minChoices : 0;
  const maxChoices = attrs.maxChoices !== undefined ? attrs.maxChoices : ideas.length;

  if (!Number.isInteger(minChoices) || minChoices < 0) {
    throw new Error(
      `survey: \`min-choices\` must be a whole number of 0 or more, got ${minChoices}.`,
    );
  }
  if (!Number.isInteger(maxChoices) || maxChoices < 1) {
    throw new Error(
      `survey: \`max-choices\` must be a whole number of at least 1, got ${maxChoices}.`,
    );
  }
  if (minChoices > maxChoices) {
    throw new Error(
      `survey: \`min-choices\` (${minChoices}) is more than \`max-choices\` (${maxChoices}), so ` +
        "no selection can satisfy both. Lower `min-choices` or raise `max-choices`.",
    );
  }
  if (maxChoices > ideas.length) {
    throw new Error(
      `survey: \`max-choices\` (${maxChoices}) is more than the ${ideas.length} ideas in the set, so ` +
        "there are never enough ideas to pick that many. Add ideas or lower `max-choices`.",
    );
  }
  return { minChoices, maxChoices };
}

/**
 * Check a response against the set it answers.
 *
 * Every id must name an idea that is actually in the set: a selection is a claim about what was
 * chosen, and one naming an idea nobody was offered is not a wrong answer but a meaningless one.
 */
function assertResponse(response: SurveyResponse, survey: Survey): void {
  const { selection, idea } = response;
  const byId = new Map(survey.ideas.map((i) => [i.id, i]));

  const seen = new Set<string>();
  selection.forEach((id, i) => {
    if (!byId.has(id)) {
      throw new Error(
        `response: \`selection\` entry ${i + 1} is ${JSON.stringify(id)}, which is not an idea in ` +
          `this survey. The ids are: ${survey.ideas.map((x) => x.id).join(", ")}.`,
      );
    }
    if (seen.has(id)) {
      throw new Error(
        `response: \`selection\` names ${JSON.stringify(id)} twice. An idea holds one place in the ` +
          "order, so each id may appear once.",
      );
    }
    seen.add(id);
  });

  if (selection.length < survey.minChoices) {
    throw new Error(
      `response: \`selection\` has ${selection.length} ${selection.length === 1 ? "idea" : "ideas"}, ` +
        `but this survey's \`min-choices\` is ${survey.minChoices}. Select more ideas, or lower \`min-choices\`.`,
    );
  }
  if (selection.length > survey.maxChoices) {
    throw new Error(
      `response: \`selection\` has ${selection.length} ideas, but this survey's \`max-choices\` is ` +
        `${survey.maxChoices}. Select fewer ideas, or raise \`max-choices\`.`,
    );
  }

  if (idea !== undefined) {
    const clash = survey.ideas.find((x) => x.text.toLowerCase() === idea.toLowerCase());
    if (clash) {
      throw new Error(
        `response: \`idea\` repeats ${JSON.stringify(clash.text)}, which is already in the set as ` +
          `${JSON.stringify(clash.id)}. \`idea\` is for one that is NOT there — select the existing one instead.`,
      );
    }
  }
}

/** Assemble a response from its attribute list. Checked against the survey by `buildSurvey`. */
export function buildResponse(raw: any): SurveyResponse {
  const attrs = mergeAttributes(raw, "response");
  assertKnownAttributes("response", attrs);

  if (attrs.selection === undefined && attrs.idea === undefined) {
    throw new Error(
      "response: is empty. A response is the ideas chosen and, optionally, a new one — " +
        'e.g. response [selection ["i2" "i0"] idea "…"].',
    );
  }

  const idea = attrs.idea !== undefined ? String(attrs.idea).trim() : undefined;
  if (idea !== undefined && !idea) {
    throw new Error(
      "response: `idea` is empty. Write the new idea, or leave `idea` out — an empty one says nothing.",
    );
  }

  return {
    selection: attrs.selection !== undefined ? (attrs.selection as string[]) : [],
    ...(idea !== undefined ? { idea } : {}),
  };
}

/**
 * Assemble the compiled survey from its attribute list.
 *
 * `response` is lifted out of the survey's list to the top level of the emitted record. It is
 * written inside the brackets because `PROG` takes the program's LAST expression, so a second
 * top-level expression would silently discard the first — but it is not part of the survey, it
 * is an answer to one, and the two must be separable by anything reading the output.
 */
export function buildSurvey(raw: any): Compiled {
  const attrs = mergeAttributes(raw, "survey");
  assertKnownAttributes("survey", attrs);

  if (attrs.name === undefined) {
    throw new Error(
      'survey: needs `name`, the survey these ideas were drawn from, e.g. survey [name "you-can-choose" ideas […]]. ' +
        "It is what ties a response back to the survey it answers.",
    );
  }
  if (attrs.ideas === undefined) {
    throw new Error(
      "survey: needs `ideas`, the set a response is chosen from, e.g. " +
        'survey [name "…" ideas ["clean air and water" "affordable housing"]]. ' +
        "The set is written at code generation, not authored by hand.",
    );
  }

  const ideas = normaliseIdeas(attrs.ideas as any[]);
  assertIdeas(ideas);
  const { minChoices, maxChoices } = resolveBounds(attrs, ideas);

  const survey: Survey = {
    name: attrs.name,
    ...(attrs.title !== undefined ? { title: attrs.title } : {}),
    ideas,
    minChoices,
    maxChoices,
  };

  if (attrs.response === undefined) return { survey };

  const response = attrs.response as SurveyResponse;
  assertResponse(response, survey);
  return { survey, response };
}
