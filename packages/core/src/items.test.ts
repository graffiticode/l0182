// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { compile, errorOf } from "./harness.js";

const SELECT = 'select [sample 10 max-choices 5]';

describe("select", () => {
  it("derives min-choices, max-choices and the hint", async () => {
    const { activity } = await compile(`items [ select [sample 8] ] {}`);
    expect(activity.items[0]).toMatchObject({
      id: 0,
      type: "select",
      sample: 8,
      minChoices: 0,
      maxChoices: 8,
      hint: "Please select 0–8 ideas below.",
    });
  });

  it("keeps an authored hint", async () => {
    const { activity } = await compile(`items [ select [sample 8 hint "Pick a few."] ] {}`);
    expect(activity.items[0].hint).toBe("Pick a few.");
  });

  it("needs a sample", async () => {
    expect(await errorOf(`items [ select [max-choices 5] ] {}`)).toContain("select: needs `sample`");
  });

  it("rejects min-choices above max-choices, and says how to fix it", async () => {
    const msg = await errorOf(`items [ select [sample 10 min-choices 6 max-choices 3] ] {}`);
    expect(msg).toContain("`min-choices` (6) is more than `max-choices` (3)");
    expect(msg).toContain("Lower `min-choices` or raise `max-choices`.");
  });

  it("rejects max-choices above the sample", async () => {
    const msg = await errorOf(`items [ select [sample 4 max-choices 9] ] {}`);
    expect(msg).toContain("`max-choices` (9) is more than `sample` (4)");
    expect(msg).toContain("Raise `sample` or lower `max-choices`.");
  });

  it("rejects a fractional sample", async () => {
    expect(await errorOf(`items [ select [sample 2.5] ] {}`)).toContain(
      "`sample` must be a whole number of at least 1",
    );
  });
});

describe("rank", () => {
  it("needs a select to rank", async () => {
    const msg = await errorOf(`items [ rank [] contribute [] ] {}`);
    expect(msg).toContain("rank: there is nothing to rank");
    expect(msg).toContain("needs a `select` before it");
  });

  it("must come after the select", async () => {
    const msg = await errorOf(`items [ rank [] ${SELECT} ] {}`);
    expect(msg).toContain("rank: comes before `select`");
  });
});

describe("results", () => {
  it("defaults limit and audience", async () => {
    const { activity } = await compile(`items [ ${SELECT} results [] ] {}`);
    expect(activity.items[1]).toMatchObject({ type: "results", limit: 10, audience: "all" });
  });

  it("takes a closed set of audiences", async () => {
    const msg = await errorOf(`items [ ${SELECT} results [audience "robots"] ] {}`);
    expect(msg).toContain('audience: "robots" is not a audience mode');
    expect(msg).toContain("all, human, agent");
  });

  it("accepts a narrowed audience", async () => {
    const { activity } = await compile(`items [ ${SELECT} results [audience "human"] ] {}`);
    expect(activity.items[1].audience).toBe("human");
  });
});

describe("flags", () => {
  it("does not swallow the attribute that follows", async () => {
    // The reason `optional` is arity 0: at arity 1 it would take {prompt: …} as its value.
    const { activity } = await compile(`items [ contribute [optional prompt "One idea."] ] {}`);
    expect(activity.items[0]).toMatchObject({ optional: true, prompt: "One idea." });
  });
});

describe("the sequence", () => {
  it("rejects a repeated kind", async () => {
    const msg = await errorOf(`items [ ${SELECT} ${SELECT} ] {}`);
    expect(msg).toContain("`select` appears twice (items 1 and 2)");
  });

  it("keeps start at the front", async () => {
    const msg = await errorOf(`items [ ${SELECT} start [] ] {}`);
    expect(msg).toContain("start: is item 2, but it opens the activity");
  });

  it("keeps thanks at the end", async () => {
    const msg = await errorOf(`items [ thanks [] ${SELECT} ] {}`);
    expect(msg).toContain("thanks: is item 1 of 2, but it closes the activity");
  });

  it("rejects an activity that asks nothing", async () => {
    const msg = await errorOf(`items [ start [] thanks [] ] {}`);
    expect(msg).toContain("never asks the participant for anything");
  });

  it("rejects an empty activity", async () => {
    expect(await errorOf(`items [] {}`)).toContain("an activity needs at least one item");
  });

  it("rejects a non-item entry", async () => {
    const msg = await errorOf(`items [ "hello" ] {}`);
    expect(msg).toContain("items: entry 1 is not an item");
  });
});
