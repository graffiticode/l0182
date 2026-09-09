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
import { Idea, assertKnownAttributes, isIdeaEnvelope, mergeAttributes } from "./attributes.js";

export interface SurveyResponse {
  /** Idea ids, in priority order. The order IS the ranking. */
  selection: string[];
  /** One idea that was not in the set. Absent when none was contributed. */
  idea?: string;
}

/**
 * A response as written, before it is checked against the set it answers.
 *
 * `selection` may name each idea by its id OR by its position, and the two are resolved to ids
 * by `resolveResponse` — the compiled record only ever carries ids, so the input sugar costs
 * nothing downstream and both clients still emit the identical shape.
 */
export interface AuthoredResponse {
  selection: Array<string | number>;
  idea?: string;
}

export interface Survey {
  name: string;
  title?: string;
  instructions?: string;
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

/** How many ideas a response may name when the survey does not say. */
const DEFAULT_MIN_CHOICES = 1;
/** Capped again at one fewer than the set, so a default never permits choosing everything. */
const DEFAULT_MAX_CHOICES = 5;

/**
 * Resolve and check the bounds a response must satisfy.
 *
 * The default ceiling is five, or one fewer than the set when the set is smaller — so a default
 * never lets a response name every idea there is. Choosing all of them is not choosing, and a
 * survey that ends up asking for it by accident has stopped measuring anything.
 *
 * The clamp applies to the DEFAULT only. A survey of three ideas that never mentioned
 * `max-choices` must not fail to compile over a number its author never wrote. Writing
 * `max-choices 3` over three ideas is a different thing — an explicit claim about this survey,
 * and the author's to make; only a ceiling larger than the set is refused.
 */
function resolveBounds(
  attrs: Record<string, any>,
  ideas: Idea[],
): { minChoices: number; maxChoices: number } {
  const minChoices = attrs.minChoices !== undefined ? attrs.minChoices : DEFAULT_MIN_CHOICES;
  const maxChoices =
    attrs.maxChoices !== undefined
      ? attrs.maxChoices
      : Math.min(DEFAULT_MAX_CHOICES, ideas.length - 1);

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

/** Loosen a text match: trim, fold case, collapse whitespace. */
const normaliseText = (t: string): string => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * How a `selection` entry finds its idea.
 *
 * Built once per response, because text matching needs to know when a key is ambiguous rather
 * than discovering it per lookup.
 */
interface Index {
  byId: Map<string, Idea>;
  /** Normalised text -> the idea, or null when more than one idea normalises to it. */
  byText: Map<string, Idea | null>;
}

function indexOf(survey: Survey): Index {
  const byId = new Map(survey.ideas.map((i) => [i.id, i]));
  const byText = new Map<string, Idea | null>();
  for (const idea of survey.ideas) {
    const key = normaliseText(idea.text);
    byText.set(key, byText.has(key) ? null : idea);
  }
  return { byId, byText };
}

/**
 * Resolve one `selection` entry to an idea id.
 *
 * Three notations, because three different callers need three different things:
 *
 * - **Its text.** The only one that works when the ideas were FETCHED. A program says
 *   `ideas fetch "<url>"`, so the set does not exist until the program compiles — which means
 *   whoever writes the response, a person or the code generator, has never seen the ids or the
 *   positions. Without this the generator guesses, and a guess that lands in range compiles
 *   clean and records the wrong ideas. That is not hypothetical: it shipped, and this is the fix.
 * - **Its id.** What a client that already read the compiled set should use — it is the key the
 *   originating service knows, and it survives the set being reordered.
 * - **Its position**, 0-based, matching the ids the language derives for a set that has none.
 *
 * A number is always a position and a string is never one, so those cannot collide. Between the
 * two string forms, an id wins: it is the canonical key, and an id that also reads as an idea's
 * text is a set that has bigger problems.
 */
function resolveRef(ref: string | number, at: number, survey: Survey, index: Index): string {
  const where = `response: \`selection\` entry ${at + 1}`;

  if (typeof ref === "number") {
    if (ref < 0 || ref >= survey.ideas.length) {
      throw new Error(
        `${where} is the position ${ref}, but this survey has ${survey.ideas.length} ideas. ` +
          `Positions count from 0, so the last one is ${survey.ideas.length - 1}.`,
      );
    }
    return survey.ideas[ref].id;
  }

  if (index.byId.has(ref)) return ref;

  const key = normaliseText(ref);
  if (index.byText.has(key)) {
    const idea = index.byText.get(key);
    if (idea) return idea.id;
    throw new Error(
      `${where} is ${JSON.stringify(ref)}, which is the text of more than one idea in this ` +
        "survey, so it does not say which. Name the idea's id instead.",
    );
  }

  throw new Error(
    `${where} is ${JSON.stringify(ref)}, which is not an idea in this survey. Name an idea by ` +
      `its exact text, by its id (${survey.ideas.map((x) => x.id).join(", ")}), or by its ` +
      "position counting from 0.",
  );
}

/**
 * Check a response against the set it answers, and resolve it to ids.
 *
 * Every entry must name an idea that is actually in the set: a selection is a claim about what
 * was chosen, and one naming an idea nobody was offered is not a wrong answer but a meaningless
 * one.
 */
function resolveResponse(authored: AuthoredResponse, survey: Survey): SurveyResponse {
  const { idea } = authored;
  const index = indexOf(survey);
  const selection: string[] = [];
  const seen = new Set<string>();

  authored.selection.forEach((ref, i) => {
    const id = resolveRef(ref, i, survey, index);
    if (seen.has(id)) {
      // Reported by id rather than as written, because `selection ["i0" 0]` — or an id beside
      // the same idea's text — names one idea twice in two notations, and saying which idea it
      // is is the whole point of the message.
      throw new Error(
        `response: \`selection\` names ${JSON.stringify(id)} twice. An idea holds one place in the ` +
          "order, so each id may appear once.",
      );
    }
    seen.add(id);
    selection.push(id);
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

  return { selection, ...(idea !== undefined ? { idea } : {}) };
}

/** Assemble a response from its attribute list. Checked against the survey by `buildSurvey`. */
export function buildResponse(raw: any): AuthoredResponse {
  const attrs = mergeAttributes(raw, "response");
  assertKnownAttributes("response", attrs);

  if (attrs.selection === undefined && attrs.idea === undefined) {
    throw new Error(
      "response: is empty. A response is the ideas chosen and, optionally, a new one — " +
        'e.g. response [selection [2 0] idea "…"].',
    );
  }

  const idea = attrs.idea !== undefined ? String(attrs.idea).trim() : undefined;
  if (idea !== undefined && !idea) {
    throw new Error(
      "response: `idea` is empty. Write the new idea, or leave `idea` out — an empty one says nothing.",
    );
  }

  return {
    selection: attrs.selection !== undefined ? (attrs.selection as Array<string | number>) : [],
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

  // A fetched dataset may bring its own `title` and `instructions` (see `isIdeaEnvelope`). They
  // are DEFAULTS: whoever wrote the program is closer to the audience than whoever published the
  // dataset, so an authored value always wins. Writing neither is what lets a one-line program
  // still render a page a person can read.
  const envelope = isIdeaEnvelope(attrs.ideas) ? attrs.ideas : null;
  const ideas = normaliseIdeas((envelope ? envelope.ideas : attrs.ideas) as any[]);
  assertIdeas(ideas);
  const { minChoices, maxChoices } = resolveBounds(attrs, ideas);

  const title = attrs.title !== undefined ? attrs.title : envelope?.title;
  const instructions = attrs.instructions !== undefined ? attrs.instructions : envelope?.instructions;

  const survey: Survey = {
    name: attrs.name,
    ...(title !== undefined ? { title } : {}),
    ...(instructions !== undefined ? { instructions } : {}),
    ideas,
    minChoices,
    maxChoices,
  };

  if (attrs.response === undefined) return { survey };

  return { survey, response: resolveResponse(attrs.response as AuthoredResponse, survey) };
}
