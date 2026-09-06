// SPDX-License-Identifier: MIT
/**
 * A stand-in collective-intelligence service.
 *
 * Engaged when no `MYSTICWONK_API_URL` is configured, so the whole flow — the rendered player
 * and the MCP tools — works end to end with no external credentials. Setting that variable
 * switches to the real service with no code change, and this file can then be deleted along
 * with the one branch in `survey.ts` that reaches it.
 *
 * What it is honest about:
 *
 *   - Sampling spreads exposure (least-shown first, then random), which is the SHAPE of adaptive
 *     sampling and the reason a pool can grow without bound. It is not the real algorithm.
 *   - Scoring is selections over times-shown. The real engine is Markov Chain Monte Carlo over
 *     the micro-rankings; this is a tally, and no amount of tidying would make it that.
 *   - Tallies are kept PER ACTOR CLASS, so `audience "human" | "agent" | "all"` genuinely
 *     filters. Without that the whole point of tagging participations would go untested.
 *
 * State is in-memory, so a cold start empties the pool and a second instance has its own. Deploy
 * with `--max-instances 1` while mocked. That is the accepted cost of not needing a database for
 * something that exists to be thrown away.
 */

import type { Actor, ActorClass, Answer, Frame, Idea } from "./survey.js";

/** What a client tells us about the activity, since the proxy never sees it. */
export interface ItemRef {
  id: number;
  type: string;
  sample?: number;
}

interface MockIdea {
  id: string;
  text: string;
  /** Times this idea has been drawn into somebody's sample, per class. */
  shown: Record<ActorClass, number>;
  /** Times it was selected once shown, per class. */
  picked: Record<ActorClass, number>;
  /** Set when a participant contributed it rather than it being seeded. */
  contributedBy?: ActorClass;
}

interface Participation {
  id: string;
  actor: Actor;
  cursor: number;
  items: ItemRef[];
  /** The sample this participant was drawn, so `rank` can name what they picked from. */
  sample: string[];
  answers: {
    selected?: string[];
    ranked?: string[];
    contribution?: string;
  };
}

interface Session {
  ideas: MockIdea[];
  participations: Map<string, Participation>;
  seq: number;
}

const zero = (): Record<ActorClass, number> => ({ human: 0, agent: 0 });

/**
 * The seed pool, modelled on a real session so a first run looks like a live survey rather than
 * an empty one. Weights are plausible starting tallies, not data.
 */
const SEED: Array<[string, number, number]> = [
  ["protect voting rights", 200, 150],
  ["universal healthcare system", 210, 141],
  ["protect public lands and waters from being sold off", 190, 124],
  ["affordable housing", 205, 131],
  ["remove profit from healthcare", 180, 113],
  ["implement Medicare for all", 175, 105],
  ["end Citizens United", 195, 111],
  ["mitigate climate change", 185, 104],
  ["enhance Medicaid", 160, 90],
  ["use revenue to help people make ends meet or get ahead", 170, 95],
  ["common sense immigration reform", 165, 82],
  ["clean air and water", 178, 87],
  ["remove ICE from communities", 150, 70],
  ["prosecute wrongdoers", 145, 63],
  ["change from two-party system to parliamentary system", 140, 52],
  ["reduce the cost of raising a family", 172, 88],
  ["affordable utilities", 158, 74],
  ["lower prescription drug prices", 168, 89],
  ["invest in public transit", 149, 66],
  ["strengthen public schools", 181, 99],
];

const sessions = new Map<string, Session>();

function sessionFor(id: string | undefined): Session {
  const key = id || "default";
  let s = sessions.get(key);
  if (!s) {
    s = {
      seq: 0,
      participations: new Map(),
      ideas: SEED.map(([text, shown, picked], i) => ({
        id: `seed-${i + 1}`,
        text,
        // Seeded history is attributed to humans: nobody has taken it as an agent yet, and
        // pretending otherwise would make the very first agent-vs-human comparison a lie.
        shown: { human: shown, agent: 0 },
        picked: { human: picked, agent: 0 },
      })),
    };
    sessions.set(key, s);
  }
  return s;
}

/** Test seam: drop all state. */
export function reset(): void {
  sessions.clear();
}

const newId = (s: Session, prefix: string): string =>
  `${prefix}-${(++s.seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Draw this participant's sample.
 *
 * Two properties have to hold together, and getting only one of them is the trap here:
 *
 *   1. Exposure spreads — least-shown ideas are preferred, which is what lets a pool grow
 *      without every participant having to see all of it.
 *   2. Samples VARY between participants. Otherwise everyone is shown the same set, and the
 *      ranking is decided by whichever ideas happened to seed lowest.
 *
 * Sorting by exposure with a random tie-break gives (1) and not (2): the seed counts differ by
 * tens, so a 0..1 jitter never reorders anything and every participant draws the identical set.
 * So: take a WINDOW of the least-shown, then choose at random within it. The window rotates as
 * exposure accumulates, which is how (1) survives.
 */
function draw(session: Session, size: number): MockIdea[] {
  const want = Math.max(0, Math.min(size, session.ideas.length));
  if (want === 0) return [];

  const total = (i: MockIdea) => i.shown.human + i.shown.agent;
  const byExposure = [...session.ideas].sort((a, b) => total(a) - total(b));

  // Wide enough that consecutive participants differ, narrow enough that the least-shown still
  // win. Twice the sample, and never less than the pool when the pool is small.
  const window = byExposure.slice(0, Math.min(byExposure.length, Math.max(want * 2, want + 4)));

  return window
    .map((idea) => ({ idea, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, want)
    .map((x) => x.idea);
}

const bare = (i: MockIdea): Idea => ({ id: i.id, text: i.text });

/** Which classes a ranking covers. */
function classesFor(audience?: string): ActorClass[] {
  if (audience === "human") return ["human"];
  if (audience === "agent") return ["agent"];
  return ["human", "agent"];
}

/**
 * The ranking, over one population.
 *
 * An idea nobody in that population has seen has no score rather than a zero — zero would say
 * the group rejected it, when in fact it was never put to them.
 */
export function rank(
  session: Session,
  audience: string | undefined,
  limit: number,
): { results: Array<Idea & { score?: number }>; participants: number } {
  const classes = classesFor(audience);
  const scored = session.ideas
    .map((idea) => {
      const shown = classes.reduce((n, c) => n + idea.shown[c], 0);
      const picked = classes.reduce((n, c) => n + idea.picked[c], 0);
      return { idea, shown, score: shown ? Math.round((picked / shown) * 100) : undefined };
    })
    .filter((x) => x.shown > 0)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.idea.text.localeCompare(b.idea.text))
    .slice(0, Math.max(1, limit));

  const participants = [...session.participations.values()].filter((p) =>
    classes.includes(p.actor.class),
  ).length;

  return {
    results: scored.map((x) => ({ ...bare(x.idea), ...(x.score !== undefined ? { score: x.score } : {}) })),
    participants,
  };
}

/** How many ideas this participant's `select` item asks for. */
function sampleSize(items: ItemRef[]): number {
  const select = items.find((i) => i.type === "select");
  return select?.sample ?? 10;
}

/**
 * Build the frame.
 *
 * Deliberately a SUPERSET: `ideas`, `selected` and `results` all ride on every frame, and each
 * renderer takes its slice. The proxy does not know which kind the cursor is on — only the
 * client holds the activity — so the alternative would be teaching this file the item sequence
 * twice over.
 */
function frameFor(session: Session, p: Participation, audience?: string, limit = 10): Frame {
  const byId = new Map(session.ideas.map((i) => [i.id, i]));
  const sample = p.sample.map((id) => byId.get(id)).filter(Boolean) as MockIdea[];
  const chosen = (p.answers.ranked ?? p.answers.selected ?? [])
    .map((id) => byId.get(id))
    .filter(Boolean) as MockIdea[];
  const { results, participants } = rank(session, audience, limit);

  return {
    participation: p.id,
    item: p.cursor,
    mock: true,
    ideas: sample.map(bare),
    selected: chosen.map(bare),
    results,
    participants,
  };
}

export interface MockOpenArgs {
  session?: string;
  participation?: string;
  actor: Actor;
  items?: ItemRef[];
}

/** Start a participation, or resume the one the token names. */
export function open({ session: sid, participation, actor, items }: MockOpenArgs): Frame {
  const session = sessionFor(sid);

  const existing = participation ? session.participations.get(participation) : undefined;
  if (existing) {
    // Resuming: keep the sample already drawn, or the participant's selections would name ideas
    // they were never shown.
    if (items?.length) existing.items = items;
    return frameFor(session, existing);
  }

  const list = items ?? [];
  const drawn = draw(session, sampleSize(list));
  for (const idea of drawn) idea.shown[actor.class] += 1;

  const p: Participation = {
    id: participation || newId(session, "p"),
    actor,
    cursor: list[0]?.id ?? 0,
    items: list,
    sample: drawn.map((i) => i.id),
    answers: {},
  };
  session.participations.set(p.id, p);
  return frameFor(session, p);
}

export interface MockAnswerArgs {
  session?: string;
  participation: string;
  actor: Actor;
  item?: number;
  items?: ItemRef[];
  answer: Answer;
}

/** Record one item's answer and advance the cursor. */
export function answer({ session: sid, participation, actor, item, items, answer: given }: MockAnswerArgs): Frame {
  const session = sessionFor(sid);
  let p = session.participations.get(participation);
  if (!p) {
    // A token from a previous process, after a cold start. Re-admitting it rather than erroring
    // keeps a demo from dead-ending on something the participant cannot fix.
    open({ session: sid, participation, actor, items: items ?? [] });
    p = session.participations.get(participation)!;
  }

  // A resumed participation may learn the sequence only now, if the client had not sent it.
  if (items?.length && !p.items.length) p.items = items;

  const a = (given || {}) as Record<string, unknown>;

  if (Array.isArray(a.selected)) {
    const chosen = new Set(a.selected as string[]);
    p.answers.selected = [...chosen];
    for (const idea of session.ideas) {
      // Only ideas this participant was actually shown can be scored by them.
      if (p.sample.includes(idea.id) && chosen.has(idea.id)) idea.picked[actor.class] += 1;
    }
  }
  if (Array.isArray(a.ranked)) {
    p.answers.ranked = a.ranked as string[];
  }
  if (typeof a.contribution === "string" && a.contribution.trim()) {
    const text = a.contribution.trim();
    p.answers.contribution = text;
    session.ideas.push({
      id: newId(session, "idea"),
      text,
      shown: zero(),
      picked: zero(),
      contributedBy: actor.class,
    });
  }

  // Advance to the next authored item, clamped at the last one. Without the clamp an overshoot
  // would index past the end and the clients would silently restart the survey.
  const at = typeof item === "number" ? item : p.cursor;
  const order = p.items.map((i) => i.id);
  const idx = order.indexOf(at);
  p.cursor = idx >= 0 && idx + 1 < order.length ? order[idx + 1] : (order[order.length - 1] ?? at);

  return frameFor(session, p);
}

export interface MockResultsArgs {
  session?: string;
  participation?: string;
  audience?: string;
  limit?: number;
}

/** The group's current ranking, over the population `audience` names. */
export function results({ session: sid, participation, audience, limit }: MockResultsArgs): Frame {
  const session = sessionFor(sid);
  const p = participation ? session.participations.get(participation) : undefined;
  const { results: r, participants } = rank(session, audience, limit || 10);
  return {
    participation: p?.id || participation || "",
    item: p?.cursor ?? 0,
    mock: true,
    results: r,
    participants,
  };
}
