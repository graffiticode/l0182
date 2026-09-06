// SPDX-License-Identifier: MIT
/**
 * The survey's item kinds, and every error message they produce.
 *
 * Each kind takes an attribute list and emits `{type, …}`. The activity layer (`activity.ts`)
 * numbers them and knows nothing about what any of them mean — the split is what makes that
 * layer a clean copy for L0180.
 *
 * All validation here runs in the TRANSFORMER. `Checker.LIST` visits only `elts[0]`, so a rule
 * written as a Checker method would fire on the first item of the activity and nowhere else.
 */
import { ITEM_KINDS, assertKnownAttributes, mergeAttributes } from "./attributes.js";

/** Kinds that capture something from the participant, and therefore submit. */
export const ANSWERING_KINDS = ["select", "rank", "contribute"] as const;

/** Kinds that only present content. */
export const CONTENT_KINDS = ["start", "results", "thanks"] as const;

const isAnswering = (type: string): boolean =>
  (ANSWERING_KINDS as readonly string[]).includes(type);

/**
 * Build one item from its attribute list.
 *
 * Presentation defaults are resolved here rather than in the renderer, so that two clients —
 * the React player and the MCP tool sequence — cannot drift about what an item says. An agent
 * reading `hint` over MCP gets the same sentence a human reads on screen.
 */
export function buildItem(kind: string, raw: any, where: string): Record<string, any> {
  const attrs = mergeAttributes(raw, where);
  assertKnownAttributes(kind, attrs);

  switch (kind) {
    case "start":
      return { type: "start", ...attrs, button: attrs.button !== undefined ? attrs.button : "Start" };

    case "select": {
      const sample = attrs.sample;
      if (sample === undefined) {
        throw new Error(
          "select: needs `sample`, the number of ideas to draw from the pool, e.g. select [sample 10 max-choices 5].",
        );
      }
      if (!Number.isInteger(sample) || sample < 1) {
        throw new Error(`select: \`sample\` must be a whole number of at least 1, got ${sample}.`);
      }
      const minChoices = attrs.minChoices !== undefined ? attrs.minChoices : 0;
      const maxChoices = attrs.maxChoices !== undefined ? attrs.maxChoices : sample;
      if (!Number.isInteger(minChoices) || minChoices < 0) {
        throw new Error(`select: \`min-choices\` must be a whole number of 0 or more, got ${minChoices}.`);
      }
      if (!Number.isInteger(maxChoices) || maxChoices < 1) {
        throw new Error(`select: \`max-choices\` must be a whole number of at least 1, got ${maxChoices}.`);
      }
      if (minChoices > maxChoices) {
        throw new Error(
          `select: \`min-choices\` (${minChoices}) is more than \`max-choices\` (${maxChoices}), ` +
            "so nothing the participant does can satisfy it. Lower `min-choices` or raise `max-choices`.",
        );
      }
      if (maxChoices > sample) {
        throw new Error(
          `select: \`max-choices\` (${maxChoices}) is more than \`sample\` (${sample}), so the ` +
            "participant is never shown enough ideas to pick that many. Raise `sample` or lower `max-choices`.",
        );
      }
      return {
        type: "select",
        ...attrs,
        sample,
        minChoices,
        maxChoices,
        hint: attrs.hint !== undefined ? attrs.hint : `Please select ${minChoices}–${maxChoices} ideas below.`,
      };
    }

    case "rank":
      return { type: "rank", ...attrs, hint: attrs.hint !== undefined ? attrs.hint : "Drag to reorder." };

    case "contribute":
      return { type: "contribute", ...attrs };

    case "results": {
      const limit = attrs.limit !== undefined ? attrs.limit : 10;
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error(`results: \`limit\` must be a whole number of at least 1, got ${limit}.`);
      }
      return {
        type: "results",
        ...attrs,
        limit,
        audience: attrs.audience !== undefined ? attrs.audience : "all",
      };
    }

    case "thanks":
      return { type: "thanks", ...attrs };

    default:
      // Unreachable via the lexicon, but a wrong tag here would otherwise emit a silent item.
      throw new Error(`${kind}: not an item kind. The activity takes: ${ITEM_KINDS.join(", ")}.`);
  }
}

/**
 * Rules that are properties of the SEQUENCE rather than of any one item.
 *
 * Every message names the fix, because the reader is a code-generating model that will retry
 * against it.
 */
export function validateSequence(items: Array<Record<string, any>>, navigation: string): void {
  if (!items.length) {
    throw new Error(
      'items: an activity needs at least one item, e.g. items [ select [sample 10 max-choices 5] ] {}.',
    );
  }

  const types = items.map((i) => i.type as string);

  const seen = new Map<string, number>();
  types.forEach((t, i) => {
    if (seen.has(t)) {
      throw new Error(
        `items: \`${t}\` appears twice (items ${seen.get(t)! + 1} and ${i + 1}). ` +
          "Each kind may appear once in a survey activity.",
      );
    }
    seen.set(t, i);
  });

  const at = (t: string) => types.indexOf(t);

  if (at("rank") >= 0 && at("select") < 0) {
    throw new Error(
      "rank: there is nothing to rank — `rank` orders the ideas a `select` item gathered, " +
        "so the activity needs a `select` before it.",
    );
  }
  if (at("rank") >= 0 && at("select") > at("rank")) {
    throw new Error(
      "rank: comes before `select`, so there is nothing to rank yet. Put the `select` item first.",
    );
  }
  if (at("start") > 0) {
    throw new Error(
      `start: is item ${at("start") + 1}, but it opens the activity. Move it to the front of the items list.`,
    );
  }
  if (at("thanks") >= 0 && at("thanks") !== types.length - 1) {
    throw new Error(
      `thanks: is item ${at("thanks") + 1} of ${types.length}, but it closes the activity. ` +
        "Move it to the end of the items list.",
    );
  }
  if (!types.some(isAnswering)) {
    throw new Error(
      "items: this activity never asks the participant for anything. Add a `select`, `rank` " +
        `or \`contribute\` item — it has only: ${types.join(", ")}.`,
    );
  }
  if (navigation === "nonlinear" && at("results") >= 0 && at("results") < types.length - 1) {
    throw new Error(
      'navigation: "nonlinear" lets a participant return to earlier items after seeing `results`, ' +
        "which shows them the group's ranking before they have finished contributing to it. " +
        'Use navigation "linear", or move `results` to the end.',
    );
  }
}
