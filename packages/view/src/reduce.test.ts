// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { reduce } from "./reduce";

describe("the language reducer", () => {
  it("falls through for everything it does not claim", () => {
    // Returning undefined is what hands the action back to the shared reducer. Claiming an
    // action by accident would stop responses recompiling, and answers would stop persisting.
    for (const type of ["init", "compiled", "loaded", "update", "response", "focus"]) {
      expect(reduce({ a: 1 }, { type })).toBeUndefined();
    }
  });

  it("merges navigation into the response without touching the rest of the model", () => {
    const data = { activity: { items: [] }, response: { participation: "p1", answers: { "0": {} } } };
    const next = reduce(data, { type: "navigate", args: { item: 2 } });
    expect(next.response).toEqual({ participation: "p1", answers: { "0": {} }, item: 2 });
    expect(next.activity).toBe(data.activity);
  });

  it("carries the participation id, which is how a run is resumed", () => {
    const next = reduce({}, { type: "navigate", args: { participation: "p9", item: 0 } });
    expect(next.response).toEqual({ participation: "p9", item: 0 });
  });

  it("ignores a navigate with nothing to merge", () => {
    const data = { response: { item: 1 } };
    expect(reduce(data, { type: "navigate" })).toBe(data);
  });
});
