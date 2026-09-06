// SPDX-License-Identifier: MIT
/**
 * The mock's behaviour, offline and deterministic where it can be.
 *
 * Worth testing despite being throwaway: it is the only backend the flow has right now, so a
 * demo that misbehaves is indistinguishable from a language that misbehaves. The audience
 * filtering in particular is the one feature this language exists to demonstrate.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { answer, open, reset, results } from "./mock-service.js";
import type { ItemRef } from "./mock-service.js";
import type { Actor } from "./survey.js";

const human: Actor = { class: "human", via: "form" };
const agent: Actor = { class: "agent", via: "mcp", host: "claude" };

const ITEMS: ItemRef[] = [
  { id: 0, type: "start" },
  { id: 1, type: "select", sample: 6 },
  { id: 2, type: "rank" },
  { id: 3, type: "contribute" },
  { id: 4, type: "results" },
  { id: 5, type: "thanks" },
];

beforeEach(() => reset());

describe("sampling", () => {
  it("draws exactly what the select item asks for", () => {
    const f = open({ session: "s", actor: human, items: ITEMS });
    expect(f.ideas).toHaveLength(6);
    expect(f.mock).toBe(true);
  });

  it("never draws more ideas than the pool holds", () => {
    const f = open({ session: "s", actor: human, items: [{ id: 0, type: "select", sample: 9999 }] });
    expect(f.ideas!.length).toBeGreaterThan(0);
    expect(f.ideas!.length).toBeLessThan(9999);
  });

  it("spreads exposure — a second participant is not shown the same six", () => {
    // Least-shown-first is what lets a pool grow without every participant seeing all of it.
    // If this ever returns an identical set, the sort key has stopped working.
    const a = open({ session: "s", actor: human, items: ITEMS }).ideas!.map((i) => i.id);
    const b = open({ session: "s", actor: human, items: ITEMS }).ideas!.map((i) => i.id);
    expect(new Set([...a, ...b]).size).toBeGreaterThan(a.length);
  });

  it("defaults to ten when the client sends no select item", () => {
    expect(open({ session: "s", actor: human, items: [] }).ideas).toHaveLength(10);
  });
});

describe("answering", () => {
  it("advances the cursor along the authored sequence", () => {
    const p = open({ session: "s", actor: human, items: ITEMS }).participation;
    expect(answer({ session: "s", participation: p, actor: human, item: 0, answer: {} }).item).toBe(1);
    expect(answer({ session: "s", participation: p, actor: human, item: 1, answer: { selected: [] } }).item).toBe(2);
  });

  it("clamps at the last item rather than running past the end", () => {
    // An overshoot used to index past the sequence, and both clients silently restart when the
    // cursor matches no item.
    const p = open({ session: "s", actor: human, items: ITEMS }).participation;
    const f = answer({ session: "s", participation: p, actor: human, item: 5, answer: {} });
    expect(f.item).toBe(5);
  });

  it("carries the selection into `selected`, which is what rank orders", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    const pick = opened.ideas!.slice(0, 2).map((i) => i.id);
    const f = answer({
      session: "s",
      participation: opened.participation,
      actor: human,
      item: 1,
      answer: { selected: pick },
    });
    expect(f.selected!.map((i) => i.id)).toEqual(pick);
  });

  it("honours a ranking over the raw selection order", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    const pick = opened.ideas!.slice(0, 3).map((i) => i.id);
    answer({ session: "s", participation: opened.participation, actor: human, item: 1, answer: { selected: pick } });
    const reordered = [pick[2], pick[0], pick[1]];
    const f = answer({
      session: "s",
      participation: opened.participation,
      actor: human,
      item: 2,
      answer: { ranked: reordered },
    });
    expect(f.selected!.map((i) => i.id)).toEqual(reordered);
  });

  it("only scores ideas the participant was actually shown", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    const before = results({ session: "s", limit: 50 }).results!.length;
    answer({
      session: "s",
      participation: opened.participation,
      actor: human,
      item: 1,
      answer: { selected: ["seed-nonexistent", opened.ideas![0].id] },
    });
    // The bogus id must not create or score anything.
    expect(results({ session: "s", limit: 50 }).results!.length).toBe(before);
  });
});

describe("contributions", () => {
  it("join the pool and become sampleable", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    answer({
      session: "s",
      participation: opened.participation,
      actor: human,
      item: 3,
      answer: { contribution: "make public transit free" },
    });
    // Asserted against a whole-pool draw, which is deterministic. A single six-idea draw is
    // not: a fresh idea has been shown to nobody, so it enters the least-shown window at the
    // front, but the window is wider than the sample and choice within it is random.
    const all = open({ session: "s", actor: agent, items: [{ id: 0, type: "select", sample: 100 }] });
    expect(all.ideas!.map((i) => i.text)).toContain("make public transit free");
  });

  it("put a fresh idea in the sampling window, so it circulates rather than starving", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    answer({
      session: "s",
      participation: opened.participation,
      actor: human,
      item: 3,
      answer: { contribution: "a brand new idea" },
    });
    // Over several participants it must actually be shown to somebody. The window is twice the
    // sample, so missing eight draws running is ~0.4% — and a contribution nobody is ever shown
    // is the failure mode that would make contributing pointless.
    const seen = Array.from({ length: 8 }, () =>
      open({ session: "s", actor: agent, items: ITEMS }).ideas!.map((i) => i.text),
    ).flat();
    expect(seen).toContain("a brand new idea");
  });

  it("ignore an empty or whitespace contribution", () => {
    const opened = open({ session: "s", actor: human, items: ITEMS });
    const before = results({ session: "s", limit: 100 }).results!.length;
    answer({ session: "s", participation: opened.participation, actor: human, item: 3, answer: { contribution: "   " } });
    const after = open({ session: "s", actor: agent, items: [{ id: 0, type: "select", sample: 100 }] });
    expect(after.ideas!.length).toBe(before);
  });
});

describe("audience", () => {
  it("separates the two populations, which is the point of tagging them", () => {
    const h = open({ session: "s", actor: human, items: ITEMS });
    answer({ session: "s", participation: h.participation, actor: human, item: 1, answer: { selected: [h.ideas![0].id] } });

    const a = open({ session: "s", actor: agent, items: ITEMS });
    answer({ session: "s", participation: a.participation, actor: agent, item: 1, answer: { selected: [a.ideas![0].id] } });

    expect(results({ session: "s", audience: "human" }).participants).toBe(1);
    expect(results({ session: "s", audience: "agent" }).participants).toBe(1);
    expect(results({ session: "s", audience: "all" }).participants).toBe(2);
  });

  it("shows an agent-only ranking built solely from agent answers", () => {
    const a = open({ session: "s", actor: agent, items: ITEMS });
    const picked = a.ideas![0].id;
    answer({ session: "s", participation: a.participation, actor: agent, item: 1, answer: { selected: [picked] } });

    const agentOnly = results({ session: "s", audience: "agent", limit: 50 }).results!;
    // Only the six an agent saw can appear, and the one it chose scores 100%.
    expect(agentOnly).toHaveLength(6);
    expect(agentOnly.find((r) => r.id === picked)!.score).toBe(100);
  });

  it("gives an idea nobody in that population saw no score, rather than zero", () => {
    // Zero would say the group rejected it; it was never put to them.
    open({ session: "s", actor: human, items: ITEMS });
    expect(results({ session: "s", audience: "agent", limit: 50 }).results).toHaveLength(0);
  });

  it("moves a score when a selection is recorded", () => {
    const a = open({ session: "s2", actor: agent, items: ITEMS });
    const id = a.ideas![0].id;
    const before = results({ session: "s2", audience: "agent", limit: 50 }).results!.find((r) => r.id === id)!.score;
    answer({ session: "s2", participation: a.participation, actor: agent, item: 1, answer: { selected: [id] } });
    const after = results({ session: "s2", audience: "agent", limit: 50 }).results!.find((r) => r.id === id)!.score;
    expect(after).toBeGreaterThan(before!);
  });
});

describe("resumption", () => {
  it("returns the same participation and the same sample", () => {
    const first = open({ session: "s", actor: human, items: ITEMS });
    answer({ session: "s", participation: first.participation, actor: human, item: 0, answer: {} });
    const again = open({ session: "s", participation: first.participation, actor: human, items: ITEMS });
    expect(again.participation).toBe(first.participation);
    expect(again.item).toBe(1);
    // The sample must not be redrawn, or a resumed participant's selections would name ideas
    // they were never shown.
    expect(again.ideas!.map((i) => i.id)).toEqual(first.ideas!.map((i) => i.id));
  });

  it("does not count a resumed participant twice", () => {
    const first = open({ session: "s", actor: human, items: ITEMS });
    open({ session: "s", participation: first.participation, actor: human, items: ITEMS });
    expect(results({ session: "s", audience: "all" }).participants).toBe(1);
  });

  it("re-admits a token from a previous process instead of dead-ending", () => {
    // In-memory state does not survive a cold start; erroring would strand a participant on
    // something they cannot fix.
    const f = answer({ session: "s", participation: "p-from-before", actor: human, items: ITEMS, item: 1, answer: {} });
    expect(f.participation).toBe("p-from-before");
  });
});

describe("sessions", () => {
  it("do not share a pool", () => {
    const a = open({ session: "alpha", actor: human, items: ITEMS });
    answer({ session: "alpha", participation: a.participation, actor: human, item: 3, answer: { contribution: "alpha idea" } });
    const b = open({ session: "beta", actor: human, items: [{ id: 0, type: "select", sample: 100 }] });
    expect(b.ideas!.map((i) => i.text)).not.toContain("alpha idea");
  });
});
