// SPDX-License-Identifier: MIT
/**
 * L0182's lexicon = L0000's base vocabulary + L0182's words.
 *
 * The attribute words are generated from `attributeFields` and `configFields` so their arity
 * can never disagree with the handlers generated from the same tables. Only containers are
 * declared by hand.
 */
import { lexicon as base, mergeLexicon } from "@graffiticode/l0000";
import {
  attributeFields,
  configFields,
  configTypeOf,
  typeOf,
  wordOf,
} from "./attributes.js";

const fn = (name: string, arity: 0 | 1 | 2, type: string, description: string) => ({
  tk: 1,
  name,
  cls: "function",
  arity,
  type,
  description,
});

/** Item-level words: arity 1, or 0 for a flag. */
const attributeWords = Object.fromEntries(
  Object.entries(attributeFields).map(([name, meta]) => [
    wordOf(name),
    fn(name, meta.flag ? 0 : 1, typeOf(meta), meta.description),
  ]),
);

/**
 * Activity-level words: arity 2, chaining.
 *
 * Each takes its value and the rest of the chain, so the tail of
 * `items [...] title "…" navigation "linear" {}` builds the configuration record the member
 * list takes as its second argument. This is the whole arity-2 set in L0182 and it is named
 * in instructions.md, per style guide §3 — keep it small.
 */
const configWords = Object.fromEntries(
  Object.entries(configFields).map(([name, meta]) => [
    wordOf(name),
    fn(name, 2, configTypeOf(meta), meta.description),
  ]),
);

/**
 * Containers, hand-written because each has a second argument role the tables cannot express.
 *
 * `items` is arity 2 — a member list. Its elements are homogeneous children (items of the
 * activity) rather than named properties, so it does not merge them; the second argument is
 * the activity's own configuration record. Uniform even when empty, per the style guide:
 * `items [...] {}` reads as "these children, no configuration", and a word that sometimes
 * takes the slot is a rule the generator has to remember rather than apply.
 *
 * Each item kind is arity 1: it takes an attribute list and nothing else.
 */
const containers = {
  items: fn(
    "ITEMS",
    2,
    "<list record: record>",
    "The activity: the items a participant works through, in order, then the activity's configuration.",
  ),
  start: fn(
    "START",
    1,
    "<list: record>",
    "A content-only item that opens the activity behind a single control.",
  ),
  select: fn(
    "SELECT",
    1,
    "<list: record>",
    "The participant is shown a sample of ideas from the pool and picks the ones they prefer.",
  ),
  rank: fn(
    "RANK",
    1,
    "<list: record>",
    "The participant puts the ideas they selected into order of preference.",
  ),
  contribute: fn(
    "CONTRIBUTE",
    1,
    "<list: record>",
    "The participant adds one idea of their own to the pool.",
  ),
  results: fn(
    "RESULTS",
    1,
    "<list: record>",
    "A content-only item showing the group's current ranking.",
  ),
  thanks: fn(
    "THANKS",
    1,
    "<list: record>",
    "A content-only item that closes the activity.",
  ),
};

export const lexicon = mergeLexicon(
  base,
  { ...attributeWords, ...configWords, ...containers },
  { langID: "L0182" },
);
