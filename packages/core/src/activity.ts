// SPDX-License-Identifier: MIT
/**
 * The activity layer: an ordered list of items, plus the delivery configuration that governs
 * how a participant moves through them.
 *
 * This is the part L0180 is missing. L0176 (Learnosity) already establishes the family's shape
 * — an activity IS a list of items — and QTI supplies the delivery vocabulary: `navigationMode`
 * and `submissionMode`. Nothing in this file knows what a survey is, deliberately: it is the
 * layer L0180 back-ports, so survey rules live in `items.ts` instead.
 *
 * Sections (QTI's `assessmentSection`) are absent on purpose. A section exists to carry a rule
 * over a GROUP of items — a random draw of 10 from a bank of 200, an ordering, a shared rubric.
 * This activity has no such group. Note that the survey's own "sample 10 of N" is NOT that
 * construct: QTI draws N authored items from a bank, whereas `select` draws N ideas from a live
 * participant-contributed pool at runtime, which is data inside one item.
 */
import { NAVIGATION_MODES, SUBMISSION_MODES, PARTICIPANT_CLASSES } from "./attributes.js";

export interface ActivityConfig {
  title?: string;
  session?: string;
  participants: string[];
  navigation: (typeof NAVIGATION_MODES)[number];
  submission: (typeof SUBMISSION_MODES)[number];
}

/** An item after numbering: whatever the kind emitted, plus its position and type. */
export interface ActivityItem {
  id: number;
  type: string;
  [key: string]: any;
}

/**
 * Resolve the configuration record into the activity's settings.
 *
 * Defaults are the live survey's behaviour: linear navigation (no going back), individual
 * submission (one submit per answered item, which is what lets a participant resume), and both
 * participant classes accepted.
 */
export function resolveConfig(raw: Record<string, any>): ActivityConfig {
  const participants = Array.isArray(raw.participants)
    ? (raw.participants as string[])
    : [...PARTICIPANT_CLASSES];

  if (!participants.length) {
    throw new Error(
      'participants: needs at least one class, e.g. participants ["human" "agent"]. ' +
        "Omit it entirely to accept both.",
    );
  }
  const duplicate = participants.find((c, i) => participants.indexOf(c) !== i);
  if (duplicate !== undefined) {
    throw new Error(`participants: "${duplicate}" is listed twice. Each class may appear once.`);
  }

  return {
    ...(raw.title !== undefined ? { title: raw.title } : {}),
    ...(raw.session !== undefined ? { session: raw.session } : {}),
    participants,
    navigation: raw.navigation !== undefined ? raw.navigation : "linear",
    submission: raw.submission !== undefined ? raw.submission : "individual",
  };
}

/**
 * Number the items by position.
 *
 * The id is the item's place in the authored order, from 0, and it is what a response is keyed
 * by. It is derived rather than authored so that nothing can be answered under a name the
 * activity does not present.
 */
export function numberItems(items: Array<Record<string, any>>): ActivityItem[] {
  return items.map((item, i) => ({ id: i, ...item }) as ActivityItem);
}

/** Assemble the compiled activity. */
export function buildActivity(
  items: Array<Record<string, any>>,
  config: Record<string, any>,
): { activity: ActivityConfig & { items: ActivityItem[] } } {
  const resolved = resolveConfig(config);
  return { activity: { ...resolved, items: numberItems(items) } };
}
