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
import { assertKnownAttributes, mergeAttributes } from "./attributes.js";
import { LoadedSurvey } from "./source.js";

/**
 * An idea as the survey's data holds it: a bare line of text, or a record carrying the
 * originating service's own id.
 *
 * Both forms exist for one reason. A survey's ideas come from wherever the survey came from,
 * and when that carried ids they have to survive into `selection`, because a selection of
 * positional ids means nothing back at the service they came from. A bare string is the
 * shorthand for a set that had no ids of its own.
 */
export interface Idea {
  id: string;
  text: string;
}

/**
 * A survey file that carries its own `title`/`instructions` alongside its ideas.
 *
 * Recognised by having an `ideas` array — a bare list has no keys at all — so a plain array of
 * ideas and an envelope can never be confused, and a file that is an object without `ideas`
 * still fails with the ordinary "expected a list of ideas" error.
 */
interface IdeaEnvelope {
  title?: string;
  instructions?: string;
  minChoices?: number;
  maxChoices?: number;
  ideas: any[];
}

const isIdeaEnvelope = (raw: any): raw is IdeaEnvelope =>
  !!raw && !Array.isArray(raw) && typeof raw === "object" && Array.isArray(raw.ideas);

/** Name a bad value the way the file wrote it, so the message points at the mistake. */
const showValue = (v: any): string => {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === null) return "null";
  if (Array.isArray(v)) return "a list";
  if (typeof v === "object") return "a record";
  return String(v);
};

/**
 * Check what a survey file holds.
 *
 * These messages are for whoever maintains the survey data, not for the program: a program
 * cannot cause or fix any of them. They still name the file, because that is the only thing
 * that locates the fault.
 */
function assertLoaded(instance: string, raw: any): any[] {
  const list = isIdeaEnvelope(raw) ? raw.ideas : raw;
  if (!Array.isArray(list) || !list.length) {
    throw new Error(
      `survey: ${instance} holds no ideas. A survey's data is a list of ideas, or a record with ` +
        "an `ideas` list alongside its title and instructions.",
    );
  }
  list.forEach((entry, i) => {
    const where = `survey: ${instance}, idea ${i + 1}`;
    if (typeof entry === "string") {
      if (!entry.trim()) throw new Error(`${where} is empty. Every idea is a line of text.`);
      return;
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `${where} is ${showValue(entry)}. Every idea is a line of text, or a record naming its ` +
          'id — e.g. {"id": "a3", "text": "affordable housing"}.',
      );
    }
    if (typeof entry.text !== "string" || !entry.text.trim()) {
      throw new Error(`${where} has no \`text\`, the line to show.`);
    }
    if (entry.id !== undefined && (typeof entry.id !== "string" || !entry.id.trim())) {
      throw new Error(`${where} has an \`id\` that is ${showValue(entry.id)}; ids are strings.`);
    }
  });
  return list;
}

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

/**
 * The wording a survey falls back to when neither the program nor its dataset says anything.
 *
 * Deliberately says what the page IS and what to do, and deliberately says nothing about how
 * many may be chosen — the bounds line beneath it is derived from min-choices/max-choices, and
 * a fallback that guessed at the count would contradict it.
 */
export const DEFAULT_INSTRUCTIONS =
  "Below is a list of ideas. Please choose the ones that matter most to you.";

export interface Survey {
  /** The survey taken. The id as written, so `you-can-choose-7` stays itself. */
  id: string;
  /** One taking of it, absent when the program did not say. */
  sessionId?: string;
  /** Which version of the survey was taken — the file the ideas came from. */
  instance: string;
  title?: string;
  instructions: string;
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
function assertIdeas(instance: string, ideas: Idea[]): void {
  if (ideas.length < 2) {
    throw new Error(
      `survey: ${instance} has ${ideas.length === 1 ? "only one idea" : "no ideas"}, so there is ` +
        "nothing to choose between. A survey needs at least two.",
    );
  }
  const byText = new Map<string, number>();
  const byId = new Map<string, number>();
  ideas.forEach((idea, i) => {
    const seenText = byText.get(idea.text);
    if (seenText !== undefined) {
      throw new Error(
        `survey: ${instance} has ideas ${seenText + 1} and ${i + 1} both ${JSON.stringify(idea.text)}. ` +
          "Each idea must be distinct — a duplicate splits the choice between two entries that mean the same thing.",
      );
    }
    byText.set(idea.text, i);
    const seenId = byId.get(idea.id);
    if (seenId !== undefined) {
      throw new Error(
        `survey: ${instance} has ideas ${seenId + 1} and ${i + 1} sharing the id ${JSON.stringify(idea.id)}, so a ` +
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
  instance: string,
  envelope: IdeaEnvelope | null,
  ideas: Idea[],
): { minChoices: number; maxChoices: number } {
  const minChoices = envelope?.minChoices !== undefined ? envelope.minChoices : DEFAULT_MIN_CHOICES;
  const maxChoices =
    envelope?.maxChoices !== undefined
      ? envelope.maxChoices
      : Math.min(DEFAULT_MAX_CHOICES, ideas.length - 1);

  if (!Number.isInteger(minChoices) || minChoices < 0) {
    throw new Error(
      `survey: ${instance} has a \`minChoices\` of ${minChoices}; it must be a whole number of 0 or more.`,
    );
  }
  if (!Number.isInteger(maxChoices) || maxChoices < 1) {
    throw new Error(
      `survey: ${instance} has a \`maxChoices\` of ${maxChoices}; it must be a whole number of at least 1.`,
    );
  }
  if (minChoices > maxChoices) {
    throw new Error(
      `survey: ${instance} asks for at least ${minChoices} and at most ${maxChoices}, so no ` +
        "selection can satisfy both.",
    );
  }
  if (maxChoices > ideas.length) {
    throw new Error(
      `survey: ${instance} allows ${maxChoices} choices but holds ${ideas.length} ideas, so there ` +
        "are never enough ideas to pick that many.",
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
 * The attribute list of a `survey`, read far enough to know what to load.
 *
 * Reading `id` and `session-id` has to happen BEFORE the survey's data can be asked for, and
 * loading it is asynchronous, so the two halves are separate: this one, and `buildSurvey`.
 */
export function readSurveyAttributes(raw: any): {
  id: string;
  sessionId?: string;
  attrs: Record<string, any>;
} {
  const attrs = mergeAttributes(raw, "survey");
  assertKnownAttributes("survey", attrs);

  if (attrs.id === undefined) {
    throw new Error(
      'survey: needs `id`, the survey being taken, e.g. survey [id "you-can-choose" session-id ' +
        'get-val-public "itemId"]. The ideas come from the survey itself, so the id is what says ' +
        "which ideas these are.",
    );
  }

  // An empty session id is what an unresolved `get-val-public "itemId"` leaves behind, and it is
  // no session at all: treating it as one would hand every such compile the same survey.
  const sessionId =
    typeof attrs.sessionId === "string" && attrs.sessionId.trim()
      ? attrs.sessionId.trim()
      : undefined;

  return { id: attrs.id, sessionId, attrs };
}

/**
 * Assemble the compiled survey from its attribute list and the survey data that was loaded for
 * it.
 *
 * The ideas, the wording and the bounds are the SURVEY's — they come from the loaded file, not
 * from the program, which says only which survey is being taken. What the program contributes
 * is the response.
 *
 * `response` is lifted out of the survey's list to the top level of the emitted record. It is
 * written inside the brackets because `PROG` takes the program's LAST expression, so a second
 * top-level expression would silently discard the first — but it is not part of the survey, it
 * is an answer to one, and the two must be separable by anything reading the output.
 */
export function buildSurvey(raw: any, loaded: LoadedSurvey): Compiled {
  const { id, sessionId, attrs } = readSurveyAttributes(raw);
  const { instance } = loaded;

  const envelope = isIdeaEnvelope(loaded.data) ? loaded.data : null;
  const ideas = normaliseIdeas(assertLoaded(instance, loaded.data));
  assertIdeas(instance, ideas);
  const { minChoices, maxChoices } = resolveBounds(instance, envelope, ideas);

  // Every compiled survey carries instructions, because a participant arrives cold and a bare
  // list of ideas does not tell them what they are looking at. Falling back rather than refusing
  // is deliberate: a survey that compiles with generic wording is still usable, whereas a hard
  // error would fail a program over prose — and the generic line is visibly generic, which is
  // what prompts someone to fix the survey's data. This is the floor, not the goal.
  const instructions =
    envelope?.instructions !== undefined ? envelope.instructions : DEFAULT_INSTRUCTIONS;

  const survey: Survey = {
    id,
    ...(sessionId !== undefined ? { sessionId } : {}),
    instance,
    ...(envelope?.title !== undefined ? { title: envelope.title } : {}),
    instructions,
    ideas,
    minChoices,
    maxChoices,
  };

  if (attrs.response === undefined) return { survey };

  return { survey, response: resolveResponse(attrs.response as AuthoredResponse, survey) };
}
