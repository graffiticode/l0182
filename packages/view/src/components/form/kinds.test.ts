// SPDX-License-Identifier: MIT
/**
 * The item registry as a state machine.
 *
 * This is the half of the player that can be wrong without looking wrong: what a participant
 * may do, what gets submitted, and what the forward control says. Rendering is not exercised —
 * these are pure functions on purpose, so they can be.
 */
import { describe, expect, it } from "vitest";
import { KINDS, knownItems } from "./items";
import { move } from "./RankItem";
import type { Frame } from "../../lib/service";

const frame = (over: Partial<Frame> = {}): Frame => ({
  participation: "p1",
  item: 0,
  ...over,
});

describe("the registry", () => {
  it("knows every item kind the language compiles", () => {
    expect(knownItems().sort()).toEqual(
      ["contribute", "rank", "results", "select", "start", "thanks"].sort(),
    );
  });
});

describe("select", () => {
  const item = { type: "select", sample: 10, minChoices: 0, maxChoices: 3 };
  const k = KINDS.select;

  it("starts from what was answered before, so going back shows your own answer", () => {
    expect(k.initial(item, frame(), { selected: ["a", "b"] })).toEqual(["a", "b"]);
    expect(k.initial(item, frame(), undefined)).toEqual([]);
  });

  it("submits the selection", () => {
    expect(k.answer(item, ["a", "b"])).toEqual({ selected: ["a", "b"] });
  });

  it("holds the author's floor", () => {
    const bounded = { ...item, minChoices: 2 };
    expect(k.ready(bounded, ["a"])).toBe(false);
    expect(k.ready(bounded, ["a", "b"])).toBe(true);
  });

  it("lets a zero-floor selection advance with nothing picked", () => {
    expect(k.ready(item, [])).toBe(true);
  });
});

describe("rank", () => {
  const item = { type: "rank" };
  const k = KINDS.rank;

  it("seeds from the ideas the select gathered", () => {
    const f = frame({ selected: [{ id: "a", text: "A" }, { id: "b", text: "B" }] });
    expect(k.initial(item, f, undefined)).toEqual(["a", "b"]);
  });

  it("prefers an order already given", () => {
    const f = frame({ selected: [{ id: "a", text: "A" }, { id: "b", text: "B" }] });
    expect(k.initial(item, f, { ranked: ["b", "a"] })).toEqual(["b", "a"]);
  });

  it("submits the order", () => {
    expect(k.answer(item, ["b", "a"])).toEqual({ ranked: ["b", "a"] });
  });
});

describe("move", () => {
  // A move, not a swap: dropping an entry below its old position shifts everything between
  // them, and an off-by-one here silently mis-orders a ranking.
  it("moves an entry down past the ones between", () => {
    expect(move(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an entry up", () => {
    expect(move(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("is not a swap", () => {
    expect(move(["a", "b", "c"], 0, 2)).not.toEqual(["c", "b", "a"]);
  });

  it("leaves the list alone for a no-op or an out-of-range index", () => {
    const l = ["a", "b"];
    expect(move(l, 1, 1)).toBe(l);
    expect(move(l, 0, 5)).toBe(l);
    expect(move(l, -1, 0)).toBe(l);
  });
});

describe("contribute", () => {
  const optional = { type: "contribute", optional: true };
  const required = { type: "contribute" };
  const k = KINDS.contribute;

  it("flips Skip to Next once there is something to submit", () => {
    expect(k.label(optional, "")).toBe("Skip");
    expect(k.label(optional, "   ")).toBe("Skip");
    expect(k.label(optional, "an idea")).toBe("Next");
  });

  it("never says Skip when the contribution is required", () => {
    expect(k.label(required, "")).toBe("Next");
  });

  it("holds a required contribution", () => {
    expect(k.ready(required, "")).toBe(false);
    expect(k.ready(required, "  ")).toBe(false);
    expect(k.ready(required, "an idea")).toBe(true);
  });

  it("lets an optional contribution be skipped", () => {
    expect(k.ready(optional, "")).toBe(true);
  });

  it("trims what it submits", () => {
    expect(k.answer(optional, "  an idea  ")).toEqual({ contribution: "an idea" });
  });
});

describe("content items", () => {
  it("capture nothing, so they never submit", () => {
    for (const kind of ["start", "results", "thanks"]) {
      expect(KINDS[kind].answer({ type: kind }, null)).toBeNull();
    }
  });

  it("labels start with Start and honours an authored button", () => {
    expect(KINDS.start.label({ type: "start" }, null)).toBe("Start");
    expect(KINDS.start.label({ type: "start", button: "Begin" }, null)).toBe("Begin");
  });

  it("gives thanks no forward control, because nothing follows", () => {
    expect(KINDS.thanks.label({ type: "thanks" }, null)).toBe("");
    expect(KINDS.thanks.ready({ type: "thanks" }, null)).toBe(false);
  });
});

describe("a whole run", () => {
  // Select 3 of 10, reorder them, skip the contribution, reach results — the flow the parity
  // test drives against the MCP tools.
  it("produces the answers the server is sent, in order", () => {
    const ideas = Array.from({ length: 10 }, (_, i) => ({ id: `i${i}`, text: `Idea ${i}` }));
    const submitted: any[] = [];

    const select = { type: "select", sample: 10, minChoices: 0, maxChoices: 5 };
    let v = KINDS.select.initial(select, frame({ ideas }), undefined);
    v = ["i1", "i4", "i7"];
    expect(KINDS.select.ready(select, v)).toBe(true);
    submitted.push(KINDS.select.answer(select, v));

    const rank = { type: "rank" };
    const selected = ideas.filter((i) => ["i1", "i4", "i7"].includes(i.id));
    let r = KINDS.rank.initial(rank, frame({ selected }), undefined);
    r = move(r, 2, 0);
    submitted.push(KINDS.rank.answer(rank, r));

    const contribute = { type: "contribute", optional: true };
    const c = KINDS.contribute.initial(contribute, frame(), undefined);
    expect(KINDS.contribute.label(contribute, c)).toBe("Skip");
    submitted.push(KINDS.contribute.answer(contribute, c));

    expect(KINDS.results.answer({ type: "results" }, null)).toBeNull();

    expect(submitted).toEqual([
      { selected: ["i1", "i4", "i7"] },
      { ranked: ["i7", "i1", "i4"] },
      { contribution: "" },
    ]);
  });
});

describe("the end of an activity", () => {
  // A content item at the end used to render a "Next" that clamped the cursor to itself and
  // did nothing, which reads as a broken survey rather than a finished one. `captures` is what
  // lets Form tell "nothing to submit and nowhere to go" from "submit, then stop".
  it("marks which kinds ask the participant for something", () => {
    expect(KINDS.select.captures).toBe(true);
    expect(KINDS.rank.captures).toBe(true);
    expect(KINDS.contribute.captures).toBe(true);
    expect(KINDS.start.captures).toBe(false);
    expect(KINDS.results.captures).toBe(false);
    expect(KINDS.thanks.captures).toBe(false);
  });

  it("agrees with whether the kind actually builds an answer", () => {
    // The flag and the behaviour must not drift: a kind that captures must produce an answer,
    // and one that does not must produce null.
    for (const [name, kind] of Object.entries(KINDS)) {
      const built = kind.answer({ type: name }, kind.initial({ type: name }, frame(), undefined));
      expect(built === null, `${name}: captures=${kind.captures} but answer() disagrees`).toBe(
        !kind.captures,
      );
    }
  });
});
