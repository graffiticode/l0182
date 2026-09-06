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
 * Two tables, because L0182 has two levels and the style guide gives them different forms:
 *
 *   `attributeFields`  arity 1 (or 0 for a flag) — describes ONE item, inside its attribute
 *                      list. The default; reach for this.
 *   `configFields`     arity 2, chaining — configures the WHOLE activity, sitting outside any
 *                      attribute list, between the items member list and its record literal.
 *                      Kept deliberately small and named in instructions.md, per §3 of the
 *                      style guide.
 */

/** How a value is turned into the field it emits. */
export interface AttributeMeta {
  /** The key this word emits. Kebab-case word -> camelCase field where they differ. */
  field: string;
  /** `object` merges the word's attribute list into one object. Absent means pass the value through. */
  shape?: "object";
  /** Type asserted before the value is used. Checked in the Transformer, never the Checker — see below. */
  expects?: "string" | "number" | "boolean" | "strings";
  /** Closed set of legal values, for a word whose value names a mode. */
  oneOf?: readonly string[];
  /**
   * Arity 0: the word stands alone and its presence IS its value.
   *
   * `contribute [optional prompt "…"]` folds to `[{optional: true}, {prompt: "…"}]`, which
   * merges. At arity 1 `optional` would swallow `{prompt: "…"}` as its argument and emit
   * `{optional: {prompt: "…"}}`, silently losing the prompt. Order-independent either way.
   */
  flag?: true;
  /** One line, shown in the generated spec. */
  description: string;
}

/** An activity-level word: same metadata, but chained at arity 2. */
export type ConfigMeta = Omit<AttributeMeta, "flag" | "shape">;

/**
 * QTI's `navigationMode`. `linear` means the participant cannot go back to an item they have
 * left; `nonlinear` lets them move freely. The MW survey is linear.
 */
export const NAVIGATION_MODES = ["linear", "nonlinear"] as const;

/**
 * QTI's `submissionMode`. `individual` submits each item as it is answered — which is what the
 * live survey does, one POST per answered item, and what lets a participant resume mid-flow.
 * `simultaneous` holds everything until the end.
 */
export const SUBMISSION_MODES = ["individual", "simultaneous"] as const;

/** Which population a displayed ranking is computed over. */
export const AUDIENCES = ["all", "human", "agent"] as const;

/**
 * The classes of participant a survey accepts.
 *
 * A class is assigned by the server from the route that was called — never self-asserted by
 * the caller — because a spoofable class would silently corrupt any later comparison between
 * the two populations.
 */
export const PARTICIPANT_CLASSES = ["human", "agent"] as const;

/** The item kinds, in the order a well-formed activity presents them. */
export const ITEM_KINDS = ["start", "select", "rank", "contribute", "results", "thanks"] as const;

/**
 * One row per item-level word. The key is the AST tag (the Transformer method name); the source
 * spelling is the key lowercased with underscores as dashes, so MIN_CHOICES is `min-choices`.
 */
export const attributeFields: Record<string, AttributeMeta> = {
  PROMPT: {
    field: "prompt",
    expects: "string",
    description: "The prose shown to the participant on this item.",
  },
  HINT: {
    field: "hint",
    expects: "string",
    description:
      "A short line under the prompt telling the participant what to do, e.g. \"Drag to reorder.\". Derived from the item when omitted.",
  },
  BUTTON: {
    field: "button",
    expects: "string",
    description: "The label on this item's forward control. Defaults to \"Next\".",
  },
  SAMPLE: {
    field: "sample",
    expects: "number",
    description:
      "How many ideas to draw from the pool for this participant. The draw is the service's adaptive sample, not a random slice, which is what lets the pool grow without bound.",
  },
  MIN_CHOICES: {
    field: "minChoices",
    expects: "number",
    description: "Fewest ideas the participant may select. Defaults to 0.",
  },
  MAX_CHOICES: {
    field: "maxChoices",
    expects: "number",
    description: "Most ideas the participant may select.",
  },
  LIMIT: {
    field: "limit",
    expects: "number",
    description: "How many ranked ideas to show. Defaults to 10.",
  },
  AUDIENCE: {
    field: "audience",
    expects: "string",
    oneOf: AUDIENCES,
    description:
      "Which population this ranking covers: all participants, humans only, or agents only. Authored rather than a runtime flag, so the result a participant sees is reproducible.",
  },
  OPTIONAL: {
    field: "optional",
    flag: true,
    description:
      "The participant may skip this item. Stands alone — it takes no value. The forward control reads Skip until they enter something.",
  },
  SHOW_SCORES: {
    field: "showScores",
    flag: true,
    description: "Show each ranked idea's score. Stands alone — it takes no value.",
  },
  SHOW_PARTICIPANTS: {
    field: "showParticipants",
    flag: true,
    description: "Show how many people have taken part. Stands alone — it takes no value.",
  },
};

/**
 * One row per activity-level word.
 *
 * These are the ONLY arity-2 words in the language. Each takes its value and the rest of the
 * chain, and returns the chain's record with its own key added — L0166's shape — so the tail
 * of `items [...] title "…" navigation "linear" {}` computes the configuration record that the
 * `items` member list takes as its second argument.
 */
export const configFields: Record<string, ConfigMeta> = {
  TITLE: {
    field: "title",
    expects: "string",
    description: "The activity's title, shown above every item.",
  },
  SESSION: {
    field: "session",
    expects: "string",
    description:
      "The collective-intelligence session this activity draws from and contributes to. Every participant of a session shares one idea pool and one ranking.",
  },
  PARTICIPANTS: {
    field: "participants",
    expects: "strings",
    oneOf: PARTICIPANT_CLASSES,
    description:
      "Which classes of participant may take part: human, agent, or both. Both when omitted.",
  },
  NAVIGATION: {
    field: "navigation",
    expects: "string",
    oneOf: NAVIGATION_MODES,
    description:
      "QTI's navigationMode. `linear` (the default) means a participant cannot return to an item they have left; `nonlinear` lets them move freely.",
  },
  SUBMISSION: {
    field: "submission",
    expects: "string",
    oneOf: SUBMISSION_MODES,
    description:
      "QTI's submissionMode. `individual` (the default) submits each item as it is answered, which is what lets a participant resume mid-flow; `simultaneous` holds everything to the end.",
  },
};

/** The signature string the generated spec renders, derived so it cannot drift from the row. */
export const typeOf = (meta: AttributeMeta): string => {
  if (meta.flag) return "<: record>";
  if (meta.shape === "object" || meta.expects === "strings") return "<list: record>";
  return `<${meta.expects || "any"}: record>`;
};

/** An arity-2 config word takes its value AND the rest of the chain. */
export const configTypeOf = (meta: ConfigMeta): string =>
  meta.expects === "strings" ? "<list record: record>" : `<${meta.expects || "any"} record: record>`;

/**
 * Which words each container accepts, in source spelling.
 *
 * This is the highest-value check in the file, and the reason it is maintained by hand: an
 * attribute list merges whatever it is handed, so a word written one level too high lands in
 * a record nothing reads, compiles clean, and silently does not do what it says.
 *
 * `activity` is not a word — the activity is the program — but it is a container for this
 * purpose, and naming it here is what lets a misplaced `title` be told where it belongs.
 */
export const validAttributes: Record<string, string[]> = {
  activity: ["title", "session", "participants", "navigation", "submission"],
  start: ["prompt", "hint", "button"],
  select: ["prompt", "hint", "button", "sample", "min-choices", "max-choices"],
  rank: ["prompt", "hint", "button"],
  contribute: ["prompt", "hint", "button", "optional"],
  results: ["prompt", "hint", "button", "limit", "audience", "show-scores", "show-participants"],
  thanks: ["prompt", "hint"],
};

export const wordOf = (name: string): string => name.toLowerCase().replace(/_/g, "-");

/** The activity-level words, in source spelling — the ones that chain outside the brackets. */
export const configWords: string[] = Object.keys(configFields).map(wordOf);

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
  if (val !== null && typeof val === "object" && val._type === "record" && val._entries instanceof Map) {
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
 * Assert a value's type. Returns an error string, or null.
 *
 * This runs in the TRANSFORMER, not the Checker, and that is not a style preference:
 * `Checker.LIST` visits only `elts[0]`, so a rule written as a Checker method fires on the
 * first element of a list and nowhere else. In a style built on lists that means almost
 * never. L0166 shipped a Checker rule rejecting negative points that did nothing for exactly
 * this reason.
 */
export function checkValue(name: string, meta: AttributeMeta | ConfigMeta, raw: any): string | null {
  const word = wordOf(name);
  if ((meta as AttributeMeta).shape === "object") {
    if (!Array.isArray(raw)) {
      return `${word}: expected an attribute list in [brackets], e.g. ${word} [prompt "…"].`;
    }
    return null;
  }
  if (meta.expects === "strings") {
    if (!Array.isArray(raw) || !raw.length) {
      // A closed set shows its own values rather than a placeholder, so the example is the
      // answer: a generator reading `["First." "Second."]` for `participants` learns nothing.
      const eg = meta.oneOf ? meta.oneOf.slice(0, 2) : ["First.", "Second."];
      return `${word}: expected a list of strings, e.g. ${word} [${eg.map((v) => `"${v}"`).join(" ")}].`;
    }
    const bad = raw.findIndex((s) => typeof s !== "string" || !s.trim());
    if (bad >= 0) {
      return `${word}: entry ${bad + 1} is ${showValue(raw[bad])}; every entry must be a non-empty string.`;
    }
    if (meta.oneOf) {
      // A closed set over a list is checked entry by entry. Tested against the value as a
      // whole it would silently pass anything once the value became a list.
      const unknown = raw.findIndex((v: string) => !meta.oneOf!.includes(v));
      if (unknown >= 0) {
        return (
          `${word}: ${showValue(raw[unknown])} is not one of the values \`${word}\` takes: ` +
          `${meta.oneOf.join(", ")}.`
        );
      }
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
  if (meta.expects === "boolean" && actual !== "boolean") {
    return `${word}: expected true or false, got ${showValue(raw)}.`;
  }
  // A closed set is checked here rather than in the Checker for the same reason every other
  // value check is: Checker.LIST would only ever reach the first element of a list.
  if (meta.oneOf && !meta.oneOf.includes(raw)) {
    return `${word}: ${showValue(raw)} is not a ${word} mode. It takes: ${meta.oneOf.join(", ")}.`;
  }
  return null;
}

/**
 * Fold an attribute list into one object. A malformed entry is a compile error, never a
 * silent drop — a dropped attribute is indistinguishable from one that did nothing.
 */
export function mergeAttributes(attrs: any, where: string): Record<string, any> {
  if (!Array.isArray(attrs)) {
    throw new Error(`${where}: expected an attribute list in [brackets], e.g. [prompt "…" sample 10].`);
  }
  const out: Record<string, any> = {};
  for (const a of attrs) {
    if (a === null || typeof a !== "object" || Array.isArray(a)) {
      throw new Error(
        `${where}: every entry must be an attribute applied to a value, e.g. [prompt "…" sample 10]. ` +
          `Got ${showValue(a)}.`,
      );
    }
    for (const k of Object.keys(a)) {
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        throw new Error(`${where}: \`${fieldWord(k)}\` is given twice. Each attribute may appear once.`);
      }
      out[k] = a[k];
    }
  }
  return out;
}

/** Map an emitted field back to its source spelling (minChoices -> min-choices). */
const fieldToWord: Record<string, string> = Object.entries({
  ...attributeFields,
  ...configFields,
}).reduce(
  (acc: Record<string, string>, [name, meta]) => {
    acc[(meta as AttributeMeta).field] = wordOf(name);
    return acc;
  },
  // Container words are not rows in either table, but they must still be nameable when a
  // container rejects one of them.
  { items: "items" },
);
const fieldWord = (field: string): string => fieldToWord[field] || field;

/**
 * Reject a word the container does not accept, naming the legal set and — the half that
 * actually fixes the program — where the misplaced word belongs.
 *
 * The generator is an LLM that reads this message and tries again, so the wording is a
 * product surface, not a diagnostic. L0176's equivalent took a deterministic failure to a
 * reliable pass, permanently and for every model.
 *
 * An activity-level word gets its own hint, because "belongs inside `activity`" would be
 * actively misleading: there is no `activity [...]` to put it in. It goes AFTER the brackets.
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
      if (container !== "activity" && configWords.includes(w)) {
        return (
          ` \`${w}\` configures the whole activity, so it goes after the items list rather than` +
          ` inside an item: items [ … ] ${w} ${w === "participants" ? '["human"]' : '"…"'} {}.`
        );
      }
      const owners = (wordOwners[w] || []).filter((o) => o !== container && o !== "activity");
      return owners.length ? ` \`${w}\` belongs inside \`${owners[0]}\`.` : "";
    })
    .join("");
  throw new Error(
    `${container}: ${unknown.map((u) => `\`${u}\``).join(", ")} ` +
      `${unknown.length === 1 ? "is not an attribute" : "are not attributes"} of ${container}. ` +
      `It takes: ${allowed.join(", ")}.${hints}`,
  );
}
