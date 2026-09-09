// SPDX-License-Identifier: MIT
/**
 * The vocabulary as data.
 *
 * Adding a word is a row in this file: the lexicon entry, the Checker method and the
 * Transformer method are all generated from it, arity included, so a word can never be
 * declared with one arity and handled with another. Never hand-write an attribute handler.
 *
 * The style is attribute lists, per `console/docs/language-authoring-style.md`: an attribute
 * word takes exactly one argument and evaluates to a single-key record, and a `[...]` list of
 * them merges into one object. Each word is the kebab-case spelling of the field it emits —
 * the 1:1 mapping is the feature, so do not invent friendlier names.
 *
 * There is ONE table. Every word in L0182 is arity 1, and nothing chains. The language had a
 * second table of arity-2 words that configured an activity from outside its brackets, and it
 * carried a trap the compiler could not see: a config word written as the last word inside an
 * item satisfied its own arity by swallowing the closing bracket, and died with "Too few
 * arguments" from the parser rather than with anything a generator could act on. There is no
 * activity now, so there is nothing to configure from outside, and the trap is gone with it.
 */

/** How a value is turned into the field it emits. */
export interface AttributeMeta {
  /** The key this word emits. Kebab-case word -> camelCase field where they differ. */
  field: string;
  /** Type asserted before the value is used. Checked in the Transformer, never the Checker — see below. */
  expects?: "string" | "number" | "refs" | "ideas";
  /** One line, shown in the generated spec. */
  description: string;
}

/**
 * One row per word. The key is the AST tag (the Transformer method name); the source spelling
 * is the key lowercased with underscores as dashes, so MIN_CHOICES is `min-choices`.
 */
export const attributeFields: Record<string, AttributeMeta> = {
  NAME: {
    field: "name",
    expects: "string",
    description:
      "The survey this set of ideas was drawn from. It is what ties a response back to the survey it answers, and it is the argument code generation resolves the idea set from.",
  },
  TITLE: {
    field: "title",
    expects: "string",
    description: "The survey's title, shown above the ideas.",
  },
  INSTRUCTIONS: {
    field: "instructions",
    expects: "string",
    description:
      "What the participant is asked to do, in your own words, shown under the title and above the ideas. The bounds line beneath it is derived from min-choices and max-choices, so instructions should say what the survey is FOR rather than restate the count.",
  },
  IDEAS: {
    field: "ideas",
    expects: "ideas",
    description:
      'The set of ideas this response is chosen from, written at code generation. Each entry is a line of text, or a record naming the service\'s own id: ideas ["…" {id: "a3" text: "…"}].',
  },
  MIN_CHOICES: {
    field: "minChoices",
    expects: "number",
    description: "Fewest ideas a response may select. Defaults to 1.",
  },
  MAX_CHOICES: {
    field: "maxChoices",
    expects: "number",
    description:
      "Most ideas a response may select. Defaults to 5, or to one fewer than the number of ideas when the set is smaller — a default never permits choosing every idea.",
  },
  SELECTION: {
    field: "selection",
    expects: "refs",
    description:
      'The ideas chosen, in priority order — the order IS the ranking, first is most important. Name each one by its exact text: selection ["clean air and water" "affordable housing"]. An id in quotes works too, and a bare whole number is a position counting from 0 — but reach for those only when you can see the set, because a wrong position records the wrong idea and still compiles.',
  },
  IDEA: {
    field: "idea",
    expects: "string",
    description:
      "One new idea, contributed by whoever answered. It must not repeat an idea already in the set — that is what makes it new.",
  },
};

/** The signature string the generated spec renders, derived so it cannot drift from the row. */
export const typeOf = (meta: AttributeMeta): string =>
  meta.expects === "refs" || meta.expects === "ideas"
    ? "<list: record>"
    : `<${meta.expects || "any"}: record>`;

/**
 * Which words each container accepts, in source spelling.
 *
 * This is the highest-value check in the file, and the reason it is maintained by hand: an
 * attribute list merges whatever it is handed, so a word written one level too high lands in
 * a record nothing reads, compiles clean, and silently does not do what it says.
 */
export const validAttributes: Record<string, string[]> = {
  survey: ["name", "title", "instructions", "ideas", "min-choices", "max-choices", "response"],
  response: ["selection", "idea"],
};

export const wordOf = (name: string): string => name.toLowerCase().replace(/_/g, "-");

/** Containers that legitimately own each word, for the "belongs inside" hint. */
const wordOwners: Record<string, string[]> = Object.entries(validAttributes).reduce(
  (acc: Record<string, string[]>, [container, words]) => {
    for (const w of words) (acc[w] = acc[w] || []).push(container);
    return acc;
  },
  {},
);

/**
 * Unwrap L0000's internal Record representation to plain JS.
 *
 * A `{...}` literal reaching a Transformer is `{_type: "record", _entries: Map}` with keys
 * encoded `tag:`/`str:`/`num:`. L0000 does not export a reader for it, so every child
 * language carries this. Dot-access without it silently misses.
 */
export function toPlainObject(val: any): any {
  if (
    val !== null &&
    typeof val === "object" &&
    val._type === "record" &&
    val._entries instanceof Map
  ) {
    const obj: any = {};
    for (const [k, v] of val._entries) {
      obj[(k as string).replace(/^(tag|str|num):/, "")] = toPlainObject(v);
    }
    return obj;
  }
  if (Array.isArray(val)) return val.map(toPlainObject);
  return val;
}

/** Name a bad value the way its author wrote it, so the message points at the mistake. */
const showValue = (v: any): string => {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === null) return "null";
  if (Array.isArray(v)) return "a list";
  if (typeof v === "object") return "a record";
  return String(v);
};

/**
 * An idea as written: a bare line of text, or a record carrying the service's own id.
 *
 * Both forms exist for one reason. Code generation inlines whatever the upstream L0170 fetch
 * returned; when that carried ids they must survive into `selection`, because a selection of
 * positional ids means nothing to the service the ideas came from. A bare string is the
 * shorthand for a set that had no ids of its own.
 */
export interface Idea {
  id: string;
  text: string;
}

/** Validate one `ideas` entry. Returns an error string, or null. */
const checkIdea = (raw: any, at: number): string | null => {
  const where = `ideas: entry ${at + 1}`;
  if (typeof raw === "string") {
    return raw.trim() ? null : `${where} is empty. Every idea must be a line of text.`;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return (
      `${where} is ${showValue(raw)}. Every idea is a line of text, or a record naming its id — ` +
      'e.g. ideas ["clean air and water" {id: "a3" text: "affordable housing"}].'
    );
  }
  if (typeof raw.text !== "string" || !raw.text.trim()) {
    return `${where} has no \`text\`. A record idea needs the line to show, e.g. {id: "a3" text: "affordable housing"}.`;
  }
  if (raw.id !== undefined && (typeof raw.id !== "string" || !raw.id.trim())) {
    return `${where} has an \`id\` that is ${showValue(raw.id)}; an id must be a non-empty string.`;
  }
  return null;
};

/**
 * Assert a value's type. Returns an error string, or null.
 *
 * This runs in the TRANSFORMER, not the Checker, and that is not a style preference:
 * `Checker.LIST` visits only `elts[0]`, so a rule written as a Checker method fires on the
 * first element of a list and nowhere else. In a style built on lists that means almost
 * never. L0166 shipped a Checker rule rejecting negative points that did nothing for exactly
 * this reason.
 */
/**
 * A fetched dataset that carries its own `title`/`instructions` alongside its ideas.
 *
 * Recognised by having an `ideas` array — a bare list has no keys at all — so a plain array
 * dataset and an envelope can never be confused, and a JSON file that happens to be an object
 * without `ideas` still fails with the ordinary "expected a list of ideas" error.
 */
export function isIdeaEnvelope(raw: any): raw is { title?: string; instructions?: string; ideas: any[] } {
  return !!raw && !Array.isArray(raw) && typeof raw === "object" && Array.isArray((raw as any).ideas);
}

export function checkValue(name: string, meta: AttributeMeta, raw: any): string | null {
  const word = wordOf(name);
  if (meta.expects === "ideas") {
    // A fetched dataset may arrive as an envelope — `{title, instructions, ideas: [...]}` — so
    // that the set carries the words a participant reads along with the ideas themselves. Only
    // `fetch` produces one; an authored `ideas [...]` is always the bare list. Unwrap before
    // checking so both forms hit the identical per-idea validation below.
    const list = isIdeaEnvelope(raw) ? raw.ideas : raw;
    if (!Array.isArray(list) || !list.length) {
      return `${word}: expected a list of ideas, e.g. ideas ["clean air and water" "affordable housing"].`;
    }
    for (let i = 0; i < list.length; i++) {
      const bad = checkIdea(list[i], i);
      if (bad) return bad;
    }
    return null;
  }
  if (meta.expects === "refs") {
    // A reference to an idea: its id as a string, or its position as a number. The two can never
    // collide — even for a set whose ids look like numbers — because the notation says which is
    // meant. Resolving them needs the ideas in hand, so that happens in `survey.ts`; here we only
    // reject an entry that is neither form.
    if (!Array.isArray(raw) || !raw.length) {
      return (
        `${word}: expected a list of ideas — each named by its text, its id, or its position, ` +
        `e.g. ${word} ["clean air and water" "affordable housing"].`
      );
    }
    const bad = raw.findIndex(
      (v) =>
        !((typeof v === "string" && v.trim()) || (typeof v === "number" && Number.isInteger(v))),
    );
    if (bad >= 0) {
      return (
        `${word}: entry ${bad + 1} is ${showValue(raw[bad])}; every entry must be an idea's id ` +
        'in "quotes", or its position as a whole number.'
      );
    }
    return null;
  }
  if (!meta.expects) return null;
  const actual = typeof raw;
  if (meta.expects === "number" && (actual !== "number" || !Number.isFinite(raw))) {
    return `${word}: expected a number, got ${showValue(raw)}.`;
  }
  if (meta.expects === "string" && actual !== "string") {
    return `${word}: expected a string in "quotes", got ${showValue(raw)}.`;
  }
  return null;
}

/**
 * Fold an attribute list into one object. A malformed entry is a compile error, never a
 * silent drop — a dropped attribute is indistinguishable from one that did nothing.
 */
export function mergeAttributes(attrs: any, where: string): Record<string, any> {
  if (!Array.isArray(attrs)) {
    throw new Error(
      `${where}: expected an attribute list in [brackets], e.g. [title "…" ideas ["…" "…"]].`,
    );
  }
  const out: Record<string, any> = {};
  for (const a of attrs) {
    if (a === null || typeof a !== "object" || Array.isArray(a)) {
      throw new Error(
        `${where}: every entry must be an attribute applied to a value, e.g. [title "…" max-choices 5]. ` +
          `Got ${showValue(a)}.`,
      );
    }
    for (const k of Object.keys(a)) {
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        throw new Error(
          `${where}: \`${fieldWord(k)}\` is given twice. Each attribute may appear once.`,
        );
      }
      out[k] = a[k];
    }
  }
  return out;
}

/** Map an emitted field back to its source spelling (minChoices -> min-choices). */
const fieldToWord: Record<string, string> = Object.entries(attributeFields).reduce(
  (acc: Record<string, string>, [name, meta]) => {
    acc[meta.field] = wordOf(name);
    return acc;
  },
  // Container words are not rows in the table, but they must still be nameable when a
  // container rejects one of them.
  { survey: "survey", response: "response" },
);
const fieldWord = (field: string): string => fieldToWord[field] || field;

/**
 * Reject a word the container does not accept, naming the legal set and — the half that
 * actually fixes the program — where the misplaced word belongs.
 *
 * The generator is an LLM that reads this message and tries again, so the wording is a
 * product surface, not a diagnostic. L0176's equivalent took a deterministic failure to a
 * reliable pass, permanently and for every model.
 */
export function assertKnownAttributes(container: string, attrs: Record<string, any>): void {
  const allowed = validAttributes[container];
  if (!allowed) return;
  const unknown = Object.keys(attrs)
    .map(fieldWord)
    .filter((w) => !allowed.includes(w));
  if (!unknown.length) return;
  const hints = unknown
    .map((w) => {
      const owners = (wordOwners[w] || []).filter((o) => o !== container);
      return owners.length ? ` \`${w}\` belongs inside \`${owners[0]}\`.` : "";
    })
    .join("");
  throw new Error(
    `${container}: ${unknown.map((u) => `\`${u}\``).join(", ")} ` +
      `${unknown.length === 1 ? "is not an attribute" : "are not attributes"} of ${container}. ` +
      `It takes: ${allowed.join(", ")}.${hints}`,
  );
}
