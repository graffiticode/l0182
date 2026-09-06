// SPDX-License-Identifier: MIT
/**
 * The item registry.
 *
 * Adding a seventh kind is one entry here plus its component — `Form` chooses nothing by
 * name. Each entry says how to render the item's body, how to turn the participant's working
 * value into the answer the server stores, whether they may move on, and what the forward
 * control reads.
 *
 * Nav lives in `Form` rather than in the components so that every item's Back/Next behaves
 * identically, and so the Skip/Next flip is stated once.
 */
import type { JSX } from "react";
import type { Answer, Frame } from "../../lib/service";
import { SelectItem } from "./SelectItem";
import { RankItem } from "./RankItem";
import { ContributeItem } from "./ContributeItem";
import { ResultsItem } from "./ResultsItem";

export interface ItemProps {
  /** The authored item: its type, prompt, hint and parameters. */
  item: any;
  /** What the server says this participant is looking at — the sample, or the ranking. */
  frame: Frame | null;
  /** The participant's working value for this item, before it is submitted. */
  value: any;
  setValue: (v: any) => void;
}

export interface ItemKind {
  Body: (p: ItemProps) => JSX.Element | null;
  /** The value this item starts from, given what the server sent and what was answered before. */
  initial: (item: any, frame: Frame | null, answered: any) => any;
  /** The answer to submit, or null when this item captures nothing. */
  answer: (item: any, value: any) => Answer | null;
  /** May the participant move on? */
  ready: (item: any, value: any) => boolean;
  /** The forward control's label. */
  label: (item: any, value: any) => string;
}

/** A content-only item has no body of its own — the stem is all of it. */
const Content = (_p: ItemProps) => null;

const contentKind = (defaultLabel: string): ItemKind => ({
  Body: Content,
  initial: () => null,
  answer: () => null,
  ready: () => true,
  label: (item) => item.button || defaultLabel,
});

export const KINDS: Record<string, ItemKind> = {
  start: contentKind("Start"),

  select: {
    Body: SelectItem,
    initial: (_item, _frame, answered) => (Array.isArray(answered?.selected) ? answered.selected : []),
    answer: (_item, value) => ({ selected: value as string[] }),
    // The author's floor is a real gate: `min-choices 1` means the participant must pick one.
    ready: (item, value) => (value?.length ?? 0) >= (item.minChoices ?? 0),
    label: (item) => item.button || "Next",
  },

  rank: {
    Body: RankItem,
    initial: (_item, frame, answered) =>
      Array.isArray(answered?.ranked) ? answered.ranked : (frame?.selected || []).map((i) => i.id),
    answer: (_item, value) => ({ ranked: value as string[] }),
    ready: () => true,
    label: (item) => item.button || "Next",
  },

  contribute: {
    Body: ContributeItem,
    initial: (_item, _frame, answered) =>
      typeof answered?.contribution === "string" ? answered.contribution : "",
    answer: (_item, value) => ({ contribution: String(value ?? "").trim() }),
    // A required contribution is the only thing that can hold a participant here.
    ready: (item, value) => !!item.optional || String(value ?? "").trim().length > 0,
    // The live survey flips the button rather than greying it out, so the participant can
    // always tell that moving on is allowed and what it will do.
    label: (item, value) =>
      String(value ?? "").trim().length > 0 ? item.button || "Next" : item.optional ? "Skip" : "Next",
  },

  results: {
    Body: ResultsItem,
    initial: () => null,
    answer: () => null,
    ready: () => true,
    label: (item) => item.button || "Next",
  },

  thanks: {
    ...contentKind("Next"),
    // The end of the activity: nothing follows, so there is no forward control at all.
    ready: () => false,
    label: () => "",
  },
};

export const knownItems = (): string[] => Object.keys(KINDS);
