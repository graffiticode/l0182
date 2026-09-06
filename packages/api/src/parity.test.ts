// SPDX-License-Identifier: MIT
/**
 * The acceptance test for the whole design: a human and an agent take the same survey and are
 * treated identically.
 *
 * "Agent vs human is transparent" is a claim about the wire, so this asserts on the wire. Both
 * clients are driven through the same proxy functions the routes call, against a recorded
 * service, and the two runs must differ in exactly one field.
 *
 * If this ever fails because the two paths diverged, the fix is to converge them — not to
 * relax the assertion. A second code path for agents is the thing this language is built to
 * avoid.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answer, open } from "./survey.js";
import type { Actor } from "./survey.js";

const human: Actor = { class: "human", via: "form" };
const agent: Actor = { class: "agent", via: "mcp", host: "claude" };

interface Call {
  path: string;
  body: any;
}

let calls: Call[];

/** A service that hands back a fixed sample and advances the cursor by one. */
function record(): void {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: any) => {
      const body = JSON.parse(init.body);
      calls.push({ path: new URL(url).pathname, body });
      const item = typeof body.item === "number" ? body.item + 1 : 0;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            participation: "p-fixed",
            item,
            ideas: [
              { id: "i1", text: "One" },
              { id: "i2", text: "Two" },
            ],
            selected: [{ id: "i2", text: "Two" }],
            results: [{ id: "i2", text: "Two", score: 61 }],
            participants: 259,
          }),
      } as any;
    }),
  );
}

/** Walk select → rank → contribute as one participant. */
async function run(actor: Actor) {
  const participants = ["human", "agent"];
  const opened = await open({ session: "s1", participants, actor });
  const a1 = await answer({
    session: "s1",
    participation: opened.participation,
    participants,
    actor,
    item: 0,
    answer: { selected: ["i2"] },
  });
  const a2 = await answer({
    session: "s1",
    participation: opened.participation,
    participants,
    actor,
    item: 1,
    answer: { ranked: ["i2"] },
  });
  await answer({
    session: "s1",
    participation: opened.participation,
    participants,
    actor,
    item: 2,
    answer: { contribution: "make transit free" },
  });
  return { opened, a1, a2, calls: calls.slice() };
}

beforeEach(() => {
  process.env.MYSTICWONK_API_URL = "https://mw.test";
  record();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MYSTICWONK_API_URL;
});

describe("a human and an agent taking the same survey", () => {
  it("hit the same endpoints in the same order", async () => {
    const asHuman = await run(human);
    record();
    const asAgent = await run(agent);

    const paths = (r: { calls: Call[] }) => r.calls.map((c) => c.path);
    expect(paths(asHuman)).toEqual([
      "/survey/participations",
      "/survey/participations/p-fixed/answers",
      "/survey/participations/p-fixed/answers",
      "/survey/participations/p-fixed/answers",
    ]);
    expect(paths(asAgent)).toEqual(paths(asHuman));
  });

  it("send byte-identical bodies apart from `actor`", async () => {
    const asHuman = await run(human);
    record();
    const asAgent = await run(agent);

    expect(asAgent.calls.length).toBe(asHuman.calls.length);
    asHuman.calls.forEach((h, i) => {
      const a = asAgent.calls[i];
      const { actor: hActor, ...hRest } = h.body;
      const { actor: aActor, ...aRest } = a.body;
      expect(aRest, `call ${i + 1} differs in something other than actor`).toEqual(hRest);
      expect(hActor).toEqual(human);
      expect(aActor).toEqual(agent);
    });
  });

  it("submits one answer per answered item — QTI's individual submission", async () => {
    const { calls: c } = await run(human);
    const answers = c.filter((x) => x.path.endsWith("/answers"));
    expect(answers.map((x) => x.body.item)).toEqual([0, 1, 2]);
    expect(answers.map((x) => x.body.answer)).toEqual([
      { selected: ["i2"] },
      { ranked: ["i2"] },
      { contribution: "make transit free" },
    ]);
  });

  it("carries the same sample and the same ranking to both", async () => {
    const asHuman = await run(human);
    record();
    const asAgent = await run(agent);
    expect(asAgent.opened.ideas).toEqual(asHuman.opened.ideas);
    expect(asAgent.a2.results).toEqual(asHuman.a2.results);
  });

  it("resumes rather than starting a second participation", async () => {
    // The participation token is the identity, so re-opening with it must not mint another.
    const first = await open({ session: "s1", actor: agent });
    record();
    const second = await open({ session: "s1", participation: first.participation, actor: agent });
    expect(second.participation).toBe(first.participation);
    expect(calls[0].body.participation).toBe(first.participation);
  });
});

describe("the activity's participants list", () => {
  it("keeps an agent out of a human-only session before any service call", async () => {
    await expect(
      open({ session: "s1", participants: ["human"], actor: agent }),
    ).rejects.toThrow(/accepts human participants/);
    expect(calls, "the refusal must not reach the service").toEqual([]);
  });
});
