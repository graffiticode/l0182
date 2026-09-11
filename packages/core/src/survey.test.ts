// SPDX-License-Identifier: MIT
/**
 * The survey record and the response to it.
 *
 * Every assertion about a failure asserts on the message TEXT, not merely that compilation
 * failed. The reader of these messages is a code-generating model that will retry against
 * them, so a message that stops naming the fix is a regression even when the program still
 * errors.
 *
 * The survey's data is served from a fixture rather than from `data/`, because what is under
 * test here is the assembly and the rules — `source.test.ts` is where the lookup itself is
 * tested. A program can no longer write a set of ideas at all, so a test that varies the set
 * varies the fixture instead.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { compile, errorOf } from "./harness.js";
import { setSource } from "./source.js";
import { DEFAULT_INSTRUCTIONS } from "./survey.js";

const THREE = ["protect voting rights", "universal healthcare system", "affordable housing"];

/** What the fixture survey holds. Reset before each test; `given` changes it. */
let data: any;

/** Install this survey's data: a bare list of ideas, or the whole envelope. */
const given = (d: any) => {
  data = Array.isArray(d) ? { ideas: d } : d;
};

beforeEach(() => {
  given(THREE);
  setSource(async (id) => ({ instance: `${id}-1`, data }));
});
afterAll(() => setSource());

/** A program taking the fixture survey. */
const survey = (body = "") => `survey [ id "fixture" ${body} ]`;

describe("the survey record", () => {
  it("compiles the ideas of the survey it names, numbering them by position", async () => {
    const out = await compile(survey());
    expect(out).toEqual({
      survey: {
        id: "fixture",
        instance: "fixture-1",
        // Always present — see "instructions are guaranteed, not optional".
        instructions: DEFAULT_INSTRUCTIONS,
        ideas: [
          { id: "i0", text: "protect voting rights" },
          { id: "i1", text: "universal healthcare system" },
          { id: "i2", text: "affordable housing" },
        ],
        minChoices: 1,
        maxChoices: 2,
      },
    });
  });

  it("records the session that took it", async () => {
    const out = await compile(`survey [ id "fixture" session-id get-val-public "itemId" ]`, {
      itemId: "7gMeEzUYkHqm3PDRrI8i",
    });
    expect(out.survey.sessionId).toBe("7gMeEzUYkHqm3PDRrI8i");
  });

  it("carries the survey's title", async () => {
    given({ title: "You Can Choose", ideas: THREE });
    expect((await compile(survey())).survey.title).toBe("You Can Choose");
  });

  it("emits no response until something answers", async () => {
    const out = await compile(survey());
    expect(out.response).toBeUndefined();
    expect(Object.keys(out)).toEqual(["survey"]);
  });

  it("keeps an idea's own id, so a selection means something to the service it came from", async () => {
    given([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
    expect((await compile(survey())).survey.ideas).toEqual([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });

  it("mixes bare strings and records in one set", async () => {
    given(["clean air and water", { id: "b7", text: "affordable housing" }]);
    expect((await compile(survey())).survey.ideas).toEqual([
      { id: "i0", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });
});

describe("a survey whose data is broken", () => {
  // None of these can be caused or fixed by the program, so every message names the file rather
  // than telling whoever wrote `id "…"` to fix something that is not theirs.
  it("refuses a survey holding no ideas", async () => {
    given({ ideas: [] });
    expect(await errorOf(survey())).toContain("fixture-1 holds no ideas");
  });

  it("refuses a set of one, because there is nothing to choose between", async () => {
    given(["only this"]);
    const msg = await errorOf(survey());
    expect(msg).toContain("fixture-1 has only one idea");
    expect(msg).toContain("at least two");
  });

  it("refuses a duplicated idea, naming both positions", async () => {
    given(["same", "other", "same"]);
    const msg = await errorOf(survey());
    expect(msg).toContain("ideas 1 and 3");
    expect(msg).toContain("splits the choice");
  });

  it("refuses two ideas sharing an id, because a selection naming it is ambiguous", async () => {
    given([
      { id: "x", text: "one" },
      { id: "x", text: "two" },
    ]);
    const msg = await errorOf(survey());
    expect(msg).toContain("sharing the id");
    expect(msg).toContain("ambiguous");
  });

  it("names the entry that is not an idea at all", async () => {
    given(["fine", 7]);
    expect(await errorOf(survey())).toContain("fixture-1, idea 2 is 7");
  });

  it("requires text on a record idea", async () => {
    given(["fine", { id: "x" }]);
    expect(await errorOf(survey())).toContain("idea 2 has no `text`");
  });
});

describe("the bounds a response must satisfy", () => {
  it("defaults to choosing 1 to 5", async () => {
    given(["a", "b", "c", "d", "e", "f", "g"]);
    const out = await compile(survey());
    expect(out.survey.minChoices).toBe(1);
    expect(out.survey.maxChoices).toBe(5);
  });

  it("never lets the DEFAULT ceiling reach the whole set", async () => {
    // Choosing everything is not choosing. The survey said nothing either, so this has to
    // compile rather than fail on a number nobody wrote.
    expect((await compile(survey())).survey.maxChoices).toBe(2);
    given(["a", "b"]);
    expect((await compile(survey())).survey.maxChoices).toBe(1);
  });

  it("lets a STATED ceiling take the whole set, because that is a claim not a default", async () => {
    given({ ideas: THREE, maxChoices: 3 });
    expect((await compile(survey())).survey.maxChoices).toBe(3);
  });

  it("refuses a ceiling larger than the set, and says why it cannot be met", async () => {
    given({ ideas: THREE, maxChoices: 9 });
    const msg = await errorOf(survey());
    expect(msg).toContain("fixture-1 allows 9 choices but holds 3 ideas");
    expect(msg).toContain("never enough ideas");
  });

  it("refuses a floor above the ceiling", async () => {
    given({ ideas: THREE, minChoices: 3, maxChoices: 2 });
    const msg = await errorOf(survey());
    expect(msg).toContain("at least 3 and at most 2");
    expect(msg).toContain("no selection can satisfy both");
  });

  it("refuses a fractional bound", async () => {
    given({ ideas: THREE, maxChoices: 1.5 });
    expect(await errorOf(survey())).toContain("whole number");
  });
});

describe("the response", () => {
  it("lifts out of the survey's list to the top level of the record", async () => {
    const out = await compile(survey(`response [ selection ["i2" "i0"] ]`));
    expect(out.response).toEqual({ selection: ["i2", "i0"] });
    expect(out.survey.response).toBeUndefined();
  });

  it("keeps the selection in the order written, because the order is the ranking", async () => {
    given({ ideas: THREE, maxChoices: 3 });
    const out = await compile(survey(`response [ selection ["i2" "i0" "i1"] ]`));
    expect(out.response.selection).toEqual(["i2", "i0", "i1"]);
  });

  it("carries one new idea alongside the selection", async () => {
    const out = await compile(survey(`response [ selection ["i0"] idea "ranked-choice voting" ]`));
    expect(out.response).toEqual({ selection: ["i0"], idea: "ranked-choice voting" });
  });

  it("allows a contributed idea with nothing selected, when the floor is lowered", async () => {
    // The floor defaults to 1, so contributing without choosing is something a survey has to
    // permit rather than the other way round.
    given({ ideas: THREE, minChoices: 0 });
    const out = await compile(survey(`response [ idea "ranked-choice voting" ]`));
    expect(out.response).toEqual({ selection: [], idea: "ranked-choice voting" });
  });

  it("refuses a response that chooses nothing under the default floor", async () => {
    expect(await errorOf(survey(`response [ idea "ranked-choice voting" ]`))).toContain(
      "`min-choices` is 1",
    );
  });

  it("refuses a name that matches nothing, and lists all three ways to name an idea", async () => {
    const msg = await errorOf(survey(`response [ selection ["i9"] ]`));
    expect(msg).toContain('entry 1 is "i9"');
    expect(msg).toContain("not an idea in this survey");
    expect(msg).toContain("by its exact text");
    expect(msg).toContain("by its id (i0, i1, i2)");
    expect(msg).toContain("position counting from 0");
  });

  it("refuses the same id twice", async () => {
    const msg = await errorOf(survey(`response [ selection ["i0" "i0"] ]`));
    expect(msg).toContain('names "i0" twice');
    expect(msg).toContain("one place in the order");
  });

  it("refuses a selection under the survey's floor", async () => {
    given({ ideas: THREE, minChoices: 2 });
    const msg = await errorOf(survey(`response [ selection ["i0"] ]`));
    expect(msg).toContain("`min-choices` is 2");
    expect(msg).toContain("Select more ideas");
  });

  it("refuses a selection over the survey's ceiling", async () => {
    given({ ideas: THREE, maxChoices: 1 });
    const msg = await errorOf(survey(`response [ selection ["i0" "i1"] ]`));
    expect(msg).toContain("`max-choices` is 1");
    expect(msg).toContain("Select fewer ideas");
  });

  it("refuses a new idea that is already in the set, and points at the existing one", async () => {
    given({ ideas: THREE, minChoices: 0 });
    const msg = await errorOf(survey(`response [ idea "affordable housing" ]`));
    expect(msg).toContain('repeats "affordable housing"');
    expect(msg).toContain("select the existing one instead");
  });

  it("catches a repeat that differs only in case", async () => {
    given({ ideas: THREE, minChoices: 0 });
    expect(await errorOf(survey(`response [ idea "Affordable Housing" ]`))).toContain("repeats");
  });

  it("refuses an empty response", async () => {
    expect(await errorOf(survey(`response [] `))).toContain("response: is empty");
  });

  it("refuses an empty new idea rather than storing a blank one", async () => {
    expect(await errorOf(survey(`response [ selection ["i0"] idea "  " ]`))).toContain(
      "`idea` is empty",
    );
  });
});

describe("selecting by text", () => {
  // The only notation available to whoever answers: the set lives in the survey's data, so a
  // person or a generator writing the response has never seen an id or a position. Without this
  // the generator guesses, and a guess that lands in range compiles clean and records the wrong
  // ideas — which is exactly what shipped before this existed.
  it("resolves an idea's text to its id", async () => {
    const out = await compile(
      survey(`response [ selection ["affordable housing" "protect voting rights"] ]`),
    );
    expect(out.response.selection).toEqual(["i2", "i0"]);
  });

  it("is forgiving about case and surrounding space, but not about the words", async () => {
    const out = await compile(survey(`response [ selection ["  Affordable Housing "] ]`));
    expect(out.response.selection).toEqual(["i2"]);
    expect(await errorOf(survey(`response [ selection ["affordable house"] ]`))).toContain(
      "not an idea in this survey",
    );
  });

  it("collapses runs of whitespace, so a reflowed line still matches", async () => {
    const out = await compile(
      survey(`response [ selection ["universal    healthcare\n  system"] ]`),
    );
    expect(out.response.selection).toEqual(["i1"]);
  });

  it("mixes text with ids and positions in one selection", async () => {
    given({
      ideas: [
        { id: "a3", text: "one" },
        { id: "b7", text: "two" },
        { id: "c1", text: "three" },
      ],
      maxChoices: 3,
    });
    const out = await compile(survey(`response [ selection ["three" "a3" 1] ]`));
    expect(out.response.selection).toEqual(["c1", "a3", "b7"]);
  });

  it("prefers an id over text when a string could be read as either", async () => {
    // An id is the canonical key. A set whose id reads as another idea's text has bigger
    // problems, but the rule has to be stated somewhere, so it is stated here.
    given([
      { id: "housing", text: "transit" },
      { id: "b7", text: "housing" },
    ]);
    const out = await compile(survey(`response [ selection ["housing"] ]`));
    expect(out.response.selection).toEqual(["housing"]);
  });

  it("catches the same idea named once by text and once by id", async () => {
    const msg = await errorOf(survey(`response [ selection ["affordable housing" "i2"] ]`));
    expect(msg).toContain('names "i2" twice');
  });

  it("refuses text that two ideas share once case is folded", async () => {
    given([
      { id: "a3", text: "Housing" },
      { id: "b7", text: "housing" },
    ]);
    const msg = await errorOf(survey(`response [ selection ["housing"] ]`));
    expect(msg).toContain("the text of more than one idea");
    expect(msg).toContain("Name the idea's id instead");
  });
});

describe("selecting by position", () => {
  // The language derives `i0`, `i1`, … for a set that carried no ids, so writing "i2" to mean
  // the third idea is ceremony over a number it invented itself. Positions are 0-based for
  // exactly that reason — they ARE the number in the derived id.
  it("resolves positions to the ids the set was given", async () => {
    const out = await compile(survey(`response [ selection [2 0] ]`));
    expect(out.response.selection).toEqual(["i2", "i0"]);
  });

  it("keeps the compiled record on ids, so the input form changes nothing downstream", async () => {
    const byPosition = await compile(survey(`response [ selection [2 0] ]`));
    const byId = await compile(survey(`response [ selection ["i2" "i0"] ]`));
    expect(byPosition).toEqual(byId);
  });

  it("accepts position 0, which is the first idea and not a missing one", async () => {
    expect((await compile(survey(`response [ selection [0] ]`))).response.selection).toEqual([
      "i0",
    ]);
  });

  it("allows the two notations side by side", async () => {
    const out = await compile(survey(`response [ selection [2 "i1"] ]`));
    expect(out.response.selection).toEqual(["i2", "i1"]);
  });

  it("catches the same idea named once by id and once by position", async () => {
    expect(await errorOf(survey(`response [ selection ["i0" 0] ]`))).toContain('names "i0" twice');
  });

  it("refuses a position past the end, and says where counting starts", async () => {
    const msg = await errorOf(survey(`response [ selection [3] ]`));
    expect(msg).toContain("the position 3, but this survey has 3 ideas");
    expect(msg).toContain("Positions count from 0, so the last one is 2");
  });

  it("refuses a negative position", async () => {
    expect(await errorOf(survey(`response [ selection [-1] ]`))).toContain("the position -1");
  });

  it("resolves a position against a set that carries the service's own ids", async () => {
    given([
      { id: "a3", text: "one" },
      { id: "b7", text: "two" },
    ]);
    expect((await compile(survey(`response [ selection [1] ]`))).response.selection).toEqual([
      "b7",
    ]);
  });

  it("resolves a position against a set where only some ideas carry ids", async () => {
    given({ ideas: [{ id: "a3", text: "one" }, "two"], maxChoices: 2 });
    const out = await compile(survey(`response [ selection [1 0] ]`));
    expect(out.response.selection).toEqual(["i1", "a3"]);
  });

  it("tells a numeric id apart from a position by its notation", async () => {
    // The one case where the two could collide: ids that look like numbers. A string is always an
    // id and a number is always a position, so `["1"]` and `[1]` name different ideas here.
    given([
      { id: "1", text: "one" },
      { id: "2", text: "two" },
    ]);
    expect((await compile(survey(`response [ selection ["1"] ]`))).response.selection).toEqual([
      "1",
    ]);
    expect((await compile(survey(`response [ selection [1] ]`))).response.selection).toEqual(["2"]);
  });

  it("refuses a fractional position", async () => {
    const msg = await errorOf(survey(`response [ selection [1.5] ]`));
    expect(msg).toContain("must be an idea's id");
    expect(msg).toContain("its position as a whole number");
  });

  it("refuses an entry that is neither an id nor a position", async () => {
    expect(await errorOf(survey(`response [ selection [true] ]`))).toContain("entry 1 is true");
  });
});

describe("misplaced words", () => {
  it("tells a selection written on the survey where it belongs", async () => {
    const msg = await errorOf(survey(`selection ["i0"]`));
    expect(msg).toContain("is not an attribute of survey");
    expect(msg).toContain("`selection` belongs inside `response`");
  });

  it("tells a contributed idea written on the survey where it belongs", async () => {
    const msg = await errorOf(survey(`idea "something new"`));
    expect(msg).toContain("is not an attribute of survey");
    expect(msg).toContain("`idea` belongs inside `response`");
  });

  it("tells an id written inside the response where it belongs", async () => {
    const msg = await errorOf(survey(`response [ selection ["i0"] id "other" ]`));
    expect(msg).toContain("is not an attribute of response");
    expect(msg).toContain("`id` belongs inside `survey`");
  });

  it("refuses the same attribute twice", async () => {
    expect(await errorOf(`survey [ id "fixture" id "other" ]`)).toContain("`id` is given twice");
  });

  it("names the expected type when a value is the wrong one", async () => {
    expect(await errorOf(`survey [ id 7 ]`)).toContain('id: expected a string in "quotes", got 7');
  });
});

describe("instructions are guaranteed, not optional", () => {
  // The compiler's one promise about the words a participant reads: a survey that reached the
  // output has instructions. Whether they are good is the survey's problem; whether they EXIST
  // is the compiler's, because a page with no explanation is the failure this prevents.
  it("substitutes a generic line when the survey's data carries none", async () => {
    expect((await compile(survey())).survey.instructions).toBe(DEFAULT_INSTRUCTIONS);
  });

  it("keeps what the survey says", async () => {
    given({ instructions: "Pick what matters to you.", ideas: THREE });
    expect((await compile(survey())).survey.instructions).toBe("Pick what matters to you.");
  });

  it("the fallback claims nothing about how many may be chosen", async () => {
    // The bounds line is rendered from minChoices/maxChoices directly beneath the instructions,
    // so a fallback naming a count would contradict it as soon as the bounds change.
    expect(DEFAULT_INSTRUCTIONS).not.toMatch(/\b(\d+|one|two|three|four|five)\b/i);
  });
});
