// SPDX-License-Identifier: MIT
/**
 * The survey record, and every error message it produces.
 *
 * A survey is a named set of options and — optionally — one response to it: the options chosen, in
 * priority order, plus one new option that was not in the set. That is the whole model. There is
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
 * An option as the survey's data holds it: a bare line of text, or a record carrying the
 * originating service's own id.
 *
 * Both forms exist for one reason. A survey's options come from wherever the survey came from,
 * and when that carried ids they have to survive into `choices`, because a selection of
 * positional ids means nothing back at the service they came from. A bare string is the
 * shorthand for a set that had no ids of its own.
 */
export interface Option {
  id: string;
  text: string;
}

/**
 * A survey file that carries its own `title`/`instructions` alongside its options.
 *
 * Recognised by having an `options` array — a bare list has no keys at all — so a plain array of
 * options and an envelope can never be confused, and a file that is an object without `options`
 * still fails with the ordinary "expected a list of options" error.
 */
interface OptionEnvelope {
  title?: string;
  instructions?: string;
  minChoices?: number;
  maxChoices?: number;
  options: any[];
}

const isOptionEnvelope = (raw: any): raw is OptionEnvelope =>
  !!raw && !Array.isArray(raw) && typeof raw === "object" && Array.isArray(raw.options);

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
  const list = isOptionEnvelope(raw) ? raw.options : raw;
  if (!Array.isArray(list) || !list.length) {
    throw new Error(
      `survey: ${instance} holds no options. A survey's data is a list of options, or a record with ` +
        "an `options` list alongside its title and instructions.",
    );
  }
  list.forEach((entry, i) => {
    const where = `survey: ${instance}, option ${i + 1}`;
    if (typeof entry === "string") {
      if (!entry.trim()) throw new Error(`${where} is empty. Every option is a line of text.`);
      return;
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(
        `${where} is ${showValue(entry)}. Every option is a line of text, or a record naming its ` +
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
  /** Option ids, in priority order. The order IS the ranking. */
  choices: string[];
  /** One option that was not in the set. Absent when none was contributed. */
  writeIn?: string;
}

/**
 * A response as written, before it is checked against the set it answers.
 *
 * `choices` may name each option by its id OR by its position, and the two are resolved to ids
 * by `resolveResponse` — the compiled record only ever carries ids, so the input sugar costs
 * nothing downstream and both clients still emit the identical shape.
 */
export interface AuthoredResponse {
  choices: Array<string | number>;
  writeIn?: string;
}

/**
 * The wording a survey falls back to when neither the program nor its dataset says anything.
 *
 * Deliberately says what the page IS and what to do, and deliberately says nothing about how
 * many may be chosen — the bounds line beneath it is derived from min-choices/max-choices, and
 * a fallback that guessed at the count would contradict it.
 */
export const DEFAULT_INSTRUCTIONS =
  "Below is a list of options. Please choose the ones that matter most to you.";

export interface Survey {
  /** The survey taken. The id as written, so `civic-priorities-7` stays itself. */
  id: string;
  /** One taking of it, absent when the program did not say. */
  sessionId?: string;
  /** Which version of the survey was taken — the file the options came from. */
  instance: string;
  /** How a response answers it. Ranked-choice: pick some options, rank them, add a write-in. */
  style: "ranked-choice";
  title?: string;
  instructions: string;
  options: Option[];
  minChoices: number;
  maxChoices: number;
}

/** What the compiler emits. `response` is absent until something answers. */
export interface Compiled {
  survey: Survey;
  response?: SurveyResponse;
}

/**
 * Give every option an id.
 *
 * An entry that named its own id keeps it — that id came from the service the set was fetched
 * from, and a `choices` of positional ids would mean nothing back there. An entry that did
 * not is numbered by position, `o0` upward, which is derived rather than authored so that
 * nothing can be selected under a name the set does not offer.
 */
function normaliseOptions(raw: any[]): Option[] {
  return raw.map((entry, i) =>
    typeof entry === "string"
      ? { id: `o${i}`, text: entry.trim() }
      : { id: typeof entry.id === "string" ? entry.id : `o${i}`, text: String(entry.text).trim() },
  );
}

/** Reject a set that cannot support a meaningful choice, or that cannot be selected from unambiguously. */
function assertOptions(instance: string, options: Option[]): void {
  if (options.length < 2) {
    throw new Error(
      `survey: ${instance} has ${options.length === 1 ? "only one option" : "no options"}, so there is ` +
        "nothing to choose between. A survey needs at least two.",
    );
  }
  const byText = new Map<string, number>();
  const byId = new Map<string, number>();
  options.forEach((option, i) => {
    const seenText = byText.get(option.text);
    if (seenText !== undefined) {
      throw new Error(
        `survey: ${instance} has options ${seenText + 1} and ${i + 1} both ${JSON.stringify(option.text)}. ` +
          "Each option must be distinct — a duplicate splits the choice between two entries that mean the same thing.",
      );
    }
    byText.set(option.text, i);
    const seenId = byId.get(option.id);
    if (seenId !== undefined) {
      throw new Error(
        `survey: ${instance} has options ${seenId + 1} and ${i + 1} sharing the id ${JSON.stringify(option.id)}, so a ` +
          "selection naming it is ambiguous. Give each option its own id, or drop the ids and let them be numbered by position.",
      );
    }
    byId.set(option.id, i);
  });
}

/** How many options a response may name when the survey does not say. */
const DEFAULT_MIN_CHOICES = 1;
/** Capped again at one fewer than the set, so a default never permits choosing everything. */
const DEFAULT_MAX_CHOICES = 5;

/**
 * Resolve and check the bounds a response must satisfy.
 *
 * The default ceiling is five, or one fewer than the set when the set is smaller — so a default
 * never lets a response name every option there is. Choosing all of them is not choosing, and a
 * survey that ends up asking for it by accident has stopped measuring anything.
 *
 * The clamp applies to the DEFAULT only. A survey of three options that never mentioned
 * `max-choices` must not fail to compile over a number its author never wrote. Writing
 * `max-choices 3` over three options is a different thing — an explicit claim about this survey,
 * and the author's to make; only a ceiling larger than the set is refused.
 */
function resolveBounds(
  instance: string,
  envelope: OptionEnvelope | null,
  options: Option[],
): { minChoices: number; maxChoices: number } {
  const minChoices = envelope?.minChoices !== undefined ? envelope.minChoices : DEFAULT_MIN_CHOICES;
  const maxChoices =
    envelope?.maxChoices !== undefined
      ? envelope.maxChoices
      : Math.min(DEFAULT_MAX_CHOICES, options.length - 1);

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
  if (maxChoices > options.length) {
    throw new Error(
      `survey: ${instance} allows ${maxChoices} choices but holds ${options.length} options, so there ` +
        "are never enough options to pick that many.",
    );
  }
  return { minChoices, maxChoices };
}

/** Loosen a text match: trim, fold case, collapse whitespace. */
const normaliseText = (t: string): string => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * How a `choices` entry finds its option.
 *
 * Built once per response, because text matching needs to know when a key is ambiguous rather
 * than discovering it per lookup.
 */
interface Index {
  byId: Map<string, Option>;
  /** Normalised text -> the option, or null when more than one option normalises to it. */
  byText: Map<string, Option | null>;
}

function indexOf(survey: Survey): Index {
  const byId = new Map(survey.options.map((i) => [i.id, i]));
  const byText = new Map<string, Option | null>();
  for (const option of survey.options) {
    const key = normaliseText(option.text);
    byText.set(key, byText.has(key) ? null : option);
  }
  return { byId, byText };
}

/**
 * Resolve one `choices` entry to an option id.
 *
 * Three notations, because three different callers need three different things:
 *
 * - **Its text.** The only one that works for whoever answers. The options live in the
 *   survey's data, so they do not exist in the program until it compiles — which means
 *   whoever writes the response, a person or the code generator, has never seen the ids or the
 *   positions. Without this the generator guesses, and a guess that lands in range compiles
 *   clean and records the wrong options. That is not hypothetical: it shipped, and this is the fix.
 * - **Its id.** What a client that already read the compiled set should use — it is the key the
 *   originating service knows, and it survives the set being reordered.
 * - **Its position**, 0-based, matching the ids the language derives for a set that has none.
 *
 * A number is always a position and a string is never one, so those cannot collide. Between the
 * two string forms, an id wins: it is the canonical key, and an id that also reads as an option's
 * text is a set that has bigger problems.
 */
function resolveRef(ref: string | number, at: number, survey: Survey, index: Index): string {
  const where = `response: \`choices\` entry ${at + 1}`;

  if (typeof ref === "number") {
    if (ref < 0 || ref >= survey.options.length) {
      throw new Error(
        `${where} is the position ${ref}, but this survey has ${survey.options.length} options. ` +
          `Positions count from 0, so the last one is ${survey.options.length - 1}.`,
      );
    }
    return survey.options[ref].id;
  }

  if (index.byId.has(ref)) return ref;

  const key = normaliseText(ref);
  if (index.byText.has(key)) {
    const option = index.byText.get(key);
    if (option) return option.id;
    throw new Error(
      `${where} is ${JSON.stringify(ref)}, which is the text of more than one option in this ` +
        "survey, so it does not say which. Name the option's id instead.",
    );
  }

  throw new Error(
    `${where} is ${JSON.stringify(ref)}, which is not an option in this survey. Name an option by ` +
      `its exact text, by its id (${survey.options.map((x) => x.id).join(", ")}), or by its ` +
      "position counting from 0.",
  );
}

/**
 * Check a response against the set it answers, and resolve it to ids.
 *
 * Every entry must name an option that is actually in the set: a selection is a claim about what
 * was chosen, and one naming an option nobody was offered is not a wrong answer but a meaningless
 * one.
 */
function resolveResponse(authored: AuthoredResponse, survey: Survey): SurveyResponse {
  const { writeIn } = authored;
  const index = indexOf(survey);
  const choices: string[] = [];
  const seen = new Set<string>();

  authored.choices.forEach((ref, i) => {
    const id = resolveRef(ref, i, survey, index);
    if (seen.has(id)) {
      // Reported by id rather than as written, because `choices ["o0" 0]` — or an id beside
      // the same option's text — names one option twice in two notations, and saying which option it
      // is is the whole point of the message.
      throw new Error(
        `response: \`choices\` names ${JSON.stringify(id)} twice. An option holds one place in the ` +
          "order, so each id may appear once.",
      );
    }
    seen.add(id);
    choices.push(id);
  });

  if (choices.length < survey.minChoices) {
    throw new Error(
      `response: \`choices\` has ${choices.length} ${choices.length === 1 ? "option" : "options"}, ` +
        `but this survey's \`min-choices\` is ${survey.minChoices}. Select more options, or lower \`min-choices\`.`,
    );
  }
  if (choices.length > survey.maxChoices) {
    throw new Error(
      `response: \`choices\` has ${choices.length} options, but this survey's \`max-choices\` is ` +
        `${survey.maxChoices}. Select fewer options, or raise \`max-choices\`.`,
    );
  }

  if (writeIn !== undefined) {
    const clash = survey.options.find((x) => x.text.toLowerCase() === writeIn.toLowerCase());
    if (clash) {
      throw new Error(
        `response: \`write-in\` repeats ${JSON.stringify(clash.text)}, which is already in the set as ` +
          `${JSON.stringify(clash.id)}. \`write-in\` is for one that is NOT there — select the existing one instead.`,
      );
    }
  }

  return { choices, ...(writeIn !== undefined ? { writeIn } : {}) };
}

/** Assemble a response from its attribute list. Checked against the survey by `buildSurvey`. */
export function buildResponse(raw: any): AuthoredResponse {
  const attrs = mergeAttributes(raw, "response");
  assertKnownAttributes("response", attrs);

  if (attrs.choices === undefined && attrs.writeIn === undefined) {
    throw new Error(
      "response: is empty. A response is the options chosen and, optionally, a new one — " +
        'e.g. response [choices [2 0] write-in "…"].',
    );
  }

  const writeIn = attrs.writeIn !== undefined ? String(attrs.writeIn).trim() : undefined;
  if (writeIn !== undefined && !writeIn) {
    throw new Error(
      "response: `write-in` is empty. Write the new option, or leave `write-in` out — an empty one says nothing.",
    );
  }

  return {
    choices: attrs.choices !== undefined ? (attrs.choices as Array<string | number>) : [],
    ...(writeIn !== undefined ? { writeIn } : {}),
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
      'survey: needs `id`, the survey being taken, e.g. survey [id "civic-priorities" session-id ' +
        'get-val-public "itemId"]. The options come from the survey itself, so the id is what says ' +
        "which options these are.",
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
 * The options, the wording and the bounds are the SURVEY's — they come from the loaded file, not
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

  const envelope = isOptionEnvelope(loaded.data) ? loaded.data : null;
  const options = normaliseOptions(assertLoaded(instance, loaded.data));
  assertOptions(instance, options);
  const { minChoices, maxChoices } = resolveBounds(instance, envelope, options);

  // Every compiled survey carries instructions, because a participant arrives cold and a bare
  // list of options does not tell them what they are looking at. Falling back rather than refusing
  // is deliberate: a survey that compiles with generic wording is still usable, whereas a hard
  // error would fail a program over prose — and the generic line is visibly generic, which is
  // what prompts someone to fix the survey's data. This is the floor, not the goal.
  const instructions =
    envelope?.instructions !== undefined ? envelope.instructions : DEFAULT_INSTRUCTIONS;

  const survey: Survey = {
    id,
    ...(sessionId !== undefined ? { sessionId } : {}),
    instance,
    style: "ranked-choice",
    ...(envelope?.title !== undefined ? { title: envelope.title } : {}),
    instructions,
    options,
    minChoices,
    maxChoices,
  };

  if (attrs.response === undefined) return { survey };

  return { survey, response: resolveResponse(attrs.response as AuthoredResponse, survey) };
}
