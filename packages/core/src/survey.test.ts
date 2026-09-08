// SPDX-License-Identifier: MIT
/**
 * The survey record and the response to it.
 *
 * Every assertion about a failure asserts on the message TEXT, not merely that compilation
 * failed. The reader of these messages is a code-generating model that will retry against
 * them, so a message that stops naming the fix is a regression even when the program still
 * errors.
 */
import { describe, expect, it } from "vitest";
import { compile, errorOf } from "./harness.js";

const IDEAS = `ideas [
  "protect voting rights"
  "universal healthcare system"
  "affordable housing"
]`;

const survey = (body: string) => `survey [ name "you-can-choose" ${body} ]`;

describe("the survey record", () => {
  it("compiles a name and a set of ideas, numbering them by position", async () => {
    const out = await compile(survey(IDEAS));
    expect(out).toEqual({
      survey: {
        name: "you-can-choose",
        ideas: [
          { id: "i0", text: "protect voting rights" },
          { id: "i1", text: "universal healthcare system" },
          { id: "i2", text: "affordable housing" },
        ],
        minChoices: 0,
        maxChoices: 3,
      },
    });
  });

  it("carries a title when one is given", async () => {
    const out = await compile(survey(`title "You Can Choose" ${IDEAS}`));
    expect(out.survey.title).toBe("You Can Choose");
  });

  it("emits no response until something answers", async () => {
    const out = await compile(survey(IDEAS));
    expect(out.response).toBeUndefined();
    expect(Object.keys(out)).toEqual(["survey"]);
  });

  it("keeps an idea's own id, so a selection means something to the service it came from", async () => {
    const out = await compile(
      survey(
        `ideas [ {id: "a3" text: "clean air and water"} {id: "b7" text: "affordable housing"} ]`,
      ),
    );
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });

  it("mixes bare strings and records in one set", async () => {
    const out = await compile(
      survey(`ideas [ "clean air and water" {id: "b7" text: "affordable housing"} ]`),
    );
    expect(out.survey.ideas).toEqual([
      { id: "i0", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });

  it("needs a name, and says what the name is for", async () => {
    const msg = await errorOf(`survey [ ${IDEAS} ]`);
    expect(msg).toContain("needs `name`");
    expect(msg).toContain("ties a response back to the survey it answers");
  });

  it("needs ideas, and says they come from code generation", async () => {
    const msg = await errorOf(`survey [ name "n" ]`);
    expect(msg).toContain("needs `ideas`");
    expect(msg).toContain("written at code generation");
  });

  it("refuses a set of one, because there is nothing to choose between", async () => {
    const msg = await errorOf(survey(`ideas [ "only this" ]`));
    expect(msg).toContain("only one idea");
    expect(msg).toContain("at least two");
  });

  it("refuses a duplicated idea, naming both positions", async () => {
    const msg = await errorOf(survey(`ideas [ "same" "other" "same" ]`));
    expect(msg).toContain("ideas 1 and 3");
    expect(msg).toContain("splits the choice");
  });

  it("refuses two ideas sharing an id, because a selection naming it is ambiguous", async () => {
    const msg = await errorOf(survey(`ideas [ {id: "x" text: "one"} {id: "x" text: "two"} ]`));
    expect(msg).toContain("share the id");
    expect(msg).toContain("ambiguous");
  });

  it("names the entry that is not an idea at all", async () => {
    const msg = await errorOf(survey(`ideas [ "fine" 7 ]`));
    expect(msg).toContain("ideas: entry 2 is 7");
  });

  it("requires text on a record idea", async () => {
    const msg = await errorOf(survey(`ideas [ "fine" {id: "x"} ]`));
    expect(msg).toContain("entry 2 has no `text`");
  });
});

describe("the bounds a response must satisfy", () => {
  it("defaults max-choices to the size of the set", async () => {
    const out = await compile(survey(IDEAS));
    expect(out.survey.maxChoices).toBe(3);
    expect(out.survey.minChoices).toBe(0);
  });

  it("refuses max-choices above the number of ideas, and says which way to fix it", async () => {
    const msg = await errorOf(survey(`${IDEAS} max-choices 9`));
    expect(msg).toContain("`max-choices` (9) is more than the 3 ideas");
    expect(msg).toContain("Add ideas or lower `max-choices`");
  });

  it("refuses min-choices above max-choices", async () => {
    const msg = await errorOf(survey(`${IDEAS} min-choices 3 max-choices 2`));
    expect(msg).toContain("`min-choices` (3) is more than `max-choices` (2)");
    expect(msg).toContain("Lower `min-choices` or raise `max-choices`");
  });

  it("refuses a fractional bound", async () => {
    expect(await errorOf(survey(`${IDEAS} max-choices 1.5`))).toContain("whole number");
  });
});

describe("the response", () => {
  it("lifts out of the survey's list to the top level of the record", async () => {
    const out = await compile(survey(`${IDEAS} response [ selection ["i2" "i0"] ]`));
    expect(out.response).toEqual({ selection: ["i2", "i0"] });
    expect(out.survey.response).toBeUndefined();
  });

  it("keeps the selection in the order written, because the order is the ranking", async () => {
    const out = await compile(survey(`${IDEAS} response [ selection ["i2" "i0" "i1"] ]`));
    expect(out.response.selection).toEqual(["i2", "i0", "i1"]);
  });

  it("carries one new idea alongside the selection", async () => {
    const out = await compile(
      survey(`${IDEAS} response [ selection ["i0"] idea "ranked-choice voting" ]`),
    );
    expect(out.response).toEqual({ selection: ["i0"], idea: "ranked-choice voting" });
  });

  it("allows a contributed idea with nothing selected", async () => {
    const out = await compile(survey(`${IDEAS} response [ idea "ranked-choice voting" ]`));
    expect(out.response).toEqual({ selection: [], idea: "ranked-choice voting" });
  });

  it("refuses an id that is not in the set, and lists the ids that are", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i9"] ]`));
    expect(msg).toContain('entry 1 is "i9"');
    expect(msg).toContain("The ids are: i0, i1, i2");
  });

  it("offers positions in that message, since they are always available", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i9"] ]`));
    expect(msg).toContain("named by its position, counting from 0");
  });

  it("refuses the same id twice", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i0" "i0"] ]`));
    expect(msg).toContain('names "i0" twice');
    expect(msg).toContain("one place in the order");
  });

  it("refuses a selection under the survey's floor", async () => {
    const msg = await errorOf(survey(`${IDEAS} min-choices 2 response [ selection ["i0"] ]`));
    expect(msg).toContain("`min-choices` is 2");
    expect(msg).toContain("Select more ideas, or lower `min-choices`");
  });

  it("refuses a selection over the survey's ceiling", async () => {
    const msg = await errorOf(survey(`${IDEAS} max-choices 1 response [ selection ["i0" "i1"] ]`));
    expect(msg).toContain("`max-choices` is 1");
    expect(msg).toContain("Select fewer ideas, or raise `max-choices`");
  });

  it("refuses a new idea that is already in the set, and points at the existing one", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ idea "affordable housing" ]`));
    expect(msg).toContain('repeats "affordable housing"');
    expect(msg).toContain("select the existing one instead");
  });

  it("catches a repeat that differs only in case", async () => {
    expect(await errorOf(survey(`${IDEAS} response [ idea "Affordable Housing" ]`))).toContain(
      "repeats",
    );
  });

  it("refuses an empty response", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [] `));
    expect(msg).toContain("response: is empty");
  });

  it("refuses an empty new idea rather than storing a blank one", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i0"] idea "  " ]`));
    expect(msg).toContain("`idea` is empty");
  });
});

describe("selecting by position", () => {
  // The language derives `i0`, `i1`, … for a set that carried no ids, so making the author write
  // "i2" to mean the third idea is ceremony over a number it invented itself. Positions are
  // 0-based for exactly that reason — they ARE the number in the derived id.
  it("resolves positions to the ids the set was given", async () => {
    const out = await compile(survey(`${IDEAS} response [ selection [2 0] ]`));
    expect(out.response.selection).toEqual(["i2", "i0"]);
  });

  it("keeps the compiled record on ids, so the input form changes nothing downstream", async () => {
    const byPosition = await compile(survey(`${IDEAS} response [ selection [2 0] ]`));
    const byId = await compile(survey(`${IDEAS} response [ selection ["i2" "i0"] ]`));
    expect(byPosition).toEqual(byId);
  });

  it("accepts position 0, which is the first idea and not a missing one", async () => {
    const out = await compile(survey(`${IDEAS} response [ selection [0] ]`));
    expect(out.response.selection).toEqual(["i0"]);
  });

  it("allows the two notations side by side", async () => {
    const out = await compile(survey(`${IDEAS} response [ selection [2 "i1"] ]`));
    expect(out.response.selection).toEqual(["i2", "i1"]);
  });

  it("catches the same idea named once by id and once by position", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i0" 0] ]`));
    expect(msg).toContain('names "i0" twice');
  });

  it("refuses a position past the end, and says where counting starts", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection [3] ]`));
    expect(msg).toContain("the position 3, but this survey has 3 ideas");
    expect(msg).toContain("Positions count from 0, so the last one is 2");
  });

  it("refuses a negative position", async () => {
    expect(await errorOf(survey(`${IDEAS} response [ selection [-1] ]`))).toContain("the position -1");
  });

  it("resolves a position against a set that carries the service's own ids", async () => {
    const out = await compile(
      survey(`ideas [ {id: "a3" text: "one"} {id: "b7" text: "two"} ] response [ selection [1] ]`),
    );
    expect(out.response.selection).toEqual(["b7"]);
  });

  it("resolves a position against a set where only some ideas carry ids", async () => {
    const out = await compile(
      survey(`ideas [ {id: "a3" text: "one"} "two" ] response [ selection [1 0] ]`),
    );
    expect(out.response.selection).toEqual(["i1", "a3"]);
  });

  it("tells a numeric id apart from a position by its notation", async () => {
    // The one case where the two could collide: ids that look like numbers. A string is always an
    // id and a number is always a position, so `["1"]` and `[1]` name different ideas here.
    const set = `ideas [ {id: "1" text: "one"} {id: "2" text: "two"} ]`;
    expect((await compile(survey(`${set} response [ selection ["1"] ]`))).response.selection).toEqual(["1"]);
    expect((await compile(survey(`${set} response [ selection [1] ]`))).response.selection).toEqual(["2"]);
  });

  it("refuses a fractional position", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection [1.5] ]`));
    expect(msg).toContain("must be an idea's id");
    expect(msg).toContain("its position as a whole number");
  });

  it("refuses an entry that is neither an id nor a position", async () => {
    expect(await errorOf(survey(`${IDEAS} response [ selection [true] ]`))).toContain(
      "entry 1 is true",
    );
  });
});

describe("misplaced words", () => {
  it("tells a selection written on the survey where it belongs", async () => {
    const msg = await errorOf(survey(`${IDEAS} selection ["i0"]`));
    expect(msg).toContain("is not an attribute of survey");
    expect(msg).toContain("`selection` belongs inside `response`");
  });

  it("tells an idea set written inside the response where it belongs", async () => {
    const msg = await errorOf(survey(`${IDEAS} response [ selection ["i0"] ideas ["x" "y"] ]`));
    expect(msg).toContain("is not an attribute of response");
    expect(msg).toContain("`ideas` belongs inside `survey`");
  });

  it("refuses the same attribute twice", async () => {
    expect(await errorOf(survey(`${IDEAS} title "A" title "B"`))).toContain(
      "`title` is given twice",
    );
  });

  it("names the expected type when a value is the wrong one", async () => {
    expect(await errorOf(survey(`${IDEAS} title 7`))).toContain(
      'title: expected a string in "quotes", got 7',
    );
  });
});
