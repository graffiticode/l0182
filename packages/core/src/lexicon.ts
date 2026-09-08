// SPDX-License-Identifier: MIT
/**
 * L0182's lexicon = L0000's base vocabulary + L0182's words.
 *
 * The attribute words are generated from `attributeFields` so their arity can never disagree
 * with the handlers generated from the same table. Only the two containers are declared by
 * hand. Every word in the language is arity 1 — nothing chains, and nothing takes a second
 * argument.
 */
import { lexicon as base, mergeLexicon } from "@graffiticode/l0000";
import { attributeFields, typeOf, wordOf } from "./attributes.js";

const fn = (name: string, arity: 0 | 1 | 2, type: string, description: string) => ({
  tk: 1,
  name,
  cls: "function",
  arity,
  type,
  description,
});

const attributeWords = Object.fromEntries(
  Object.entries(attributeFields).map(([name, meta]) => [
    wordOf(name),
    fn(name, 1, typeOf(meta), meta.description),
  ]),
);

/**
 * The two containers, hand-written because each assembles a record rather than emitting one
 * key. Both are arity 1: an attribute list in, one record out.
 *
 * `response` is written inside `survey`'s list and lifted to the top level of the output. It
 * nests because `PROG` takes the program's last expression, so a second top-level expression
 * would silently discard the first.
 */
const containers = {
  // Not a container, but hand-written for the same reason they are: it evaluates to a value the
  // attribute table cannot describe — whatever the dataset holds — rather than to a keyed record.
  fetch: fn(
    "FETCH",
    1,
    "<string: any>",
    "Reads a dataset over HTTP at compile time and evaluates to it: JSON, or CSV as a list of records keyed by its header row. This is how `ideas` gets its set.",
  ),
  survey: fn(
    "SURVEY",
    1,
    "<list: record>",
    "A named set of ideas to choose from, and optionally the response to it.",
  ),
  response: fn(
    "RESPONSE",
    1,
    "<list: record>",
    "The ideas chosen, in priority order, and optionally one new idea that was not in the set.",
  ),
};

export const lexicon = mergeLexicon(
  base,
  { ...attributeWords, ...containers },
  { langID: "L0182" },
);
