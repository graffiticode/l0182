// SPDX-License-Identifier: MIT
/**
 * The projection the renderer draws from.
 *
 * There is no DOM in this suite and there should not be: `vitest.config.ts` pulls in no jsdom,
 * which is what keeps a published component's dev tree free of a rendering library. So the
 * logic that can be wrong without looking wrong lives here, where it can be tested, and the
 * component stays a projection of it.
 */
import { describe, expect, it } from "vitest";
import { boundsLabel, resolveSelection } from "./survey";
import type { Survey } from "./survey";

const survey = (over: Partial<Survey> = {}): Survey => ({
  name: "you-can-choose",
  // The compiler guarantees this field, so the fixture carries it too — the view is a
  // projection of the compiled record and must not be typed more loosely than one.
  instructions: "Below is a list of ideas. Please choose the ones that matter most to you.",
  ideas: [
    { id: "i0", text: "clean air and water" },
    { id: "i1", text: "affordable housing" },
    { id: "i2", text: "invest in public transit" },
  ],
  minChoices: 0,
  maxChoices: 3,
  ...over,
});

describe("resolveSelection", () => {
  it("returns the chosen ideas in the order the response put them, not the set's order", () => {
    const { chosen } = resolveSelection(survey(), { selection: ["i2", "i0"] });
    expect(chosen.map((i) => i.id)).toEqual(["i2", "i0"]);
    expect(chosen.map((i) => i.text)).toEqual(["invest in public transit", "clean air and water"]);
  });

  it("reports which ids the selection was chosen from, for dimming them in the set", () => {
    const { chosenIds } = resolveSelection(survey(), { selection: ["i2", "i0"] });
    expect([...chosenIds].sort()).toEqual(["i0", "i2"]);
  });

  it("names an id that matches nothing rather than dropping it", () => {
    // Dropping it would render a shorter ranking than the one actually recorded — wrong in the
    // way that looks right. The compiler refuses these, so they only arrive on a record built
    // outside it.
    const { chosen, unknown } = resolveSelection(survey(), { selection: ["i0", "gone", "i1"] });
    expect(chosen.map((i) => i.id)).toEqual(["i0", "i1"]);
    expect(unknown).toEqual(["gone"]);
  });

  it("resolves against the service's own ids when the set carried them", () => {
    const s = survey({
      ideas: [
        { id: "a3", text: "one" },
        { id: "b7", text: "two" },
      ],
    });
    const { chosen, unknown } = resolveSelection(s, { selection: ["b7"] });
    expect(chosen).toEqual([{ id: "b7", text: "two" }]);
    expect(unknown).toEqual([]);
  });

  it("is empty for a survey nothing has answered", () => {
    const { chosen, unknown, chosenIds } = resolveSelection(survey(), undefined);
    expect(chosen).toEqual([]);
    expect(unknown).toEqual([]);
    expect(chosenIds.size).toBe(0);
  });

  it("is empty for a response that contributed an idea and chose nothing", () => {
    const { chosen } = resolveSelection(survey(), { selection: [], idea: "ranked-choice voting" });
    expect(chosen).toEqual([]);
  });

  it("survives a survey that has not compiled", () => {
    expect(resolveSelection(undefined, { selection: ["i0"] })).toEqual({
      chosen: [],
      unknown: ["i0"],
      chosenIds: new Set(),
    });
  });
});

describe("boundsLabel", () => {
  it("states an exact count when the bounds are equal", () => {
    expect(boundsLabel(survey({ minChoices: 2, maxChoices: 2 }))).toBe("Choose 2 of 3");
  });

  it("says there is no ceiling when max-choices is the whole set", () => {
    expect(boundsLabel(survey({ minChoices: 0, maxChoices: 3 }))).toBe("Choose any of 3");
  });

  it("states a ceiling alone when there is no floor", () => {
    expect(boundsLabel(survey({ minChoices: 0, maxChoices: 2 }))).toBe("Choose up to 2 of 3");
  });

  it("states a range when both bounds bite", () => {
    expect(boundsLabel(survey({ minChoices: 1, maxChoices: 2 }))).toBe("Choose 1–2 of 3");
  });
});
