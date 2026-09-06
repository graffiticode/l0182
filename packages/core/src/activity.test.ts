// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { compile, errorOf } from "./harness.js";

const SELECT = 'select [sample 10 max-choices 5]';

describe("activity configuration", () => {
  it("defaults navigation, submission and participants", async () => {
    const { activity } = await compile(`items [ ${SELECT} ] {}`);
    expect(activity).toMatchObject({
      navigation: "linear",
      submission: "individual",
      participants: ["human", "agent"],
    });
  });

  it("chains settings after the items list", async () => {
    const { activity } = await compile(
      `items [ ${SELECT} ] title "T" session "s1" participants ["human"] navigation "nonlinear" submission "simultaneous" {}`,
    );
    expect(activity).toMatchObject({
      title: "T",
      session: "s1",
      participants: ["human"],
      navigation: "nonlinear",
      submission: "simultaneous",
    });
  });

  it("numbers items by position", async () => {
    const { activity } = await compile(`items [ start [] ${SELECT} rank [] thanks [] ] {}`);
    expect(activity.items.map((i: any) => [i.id, i.type])).toEqual([
      [0, "start"],
      [1, "select"],
      [2, "rank"],
      [3, "thanks"],
    ]);
  });

  it("takes a closed set of navigation modes", async () => {
    const msg = await errorOf(`items [ ${SELECT} ] navigation "backwards" {}`);
    expect(msg).toContain('navigation: "backwards" is not a navigation mode');
    expect(msg).toContain("linear, nonlinear");
  });

  it("takes a closed set of submission modes", async () => {
    expect(await errorOf(`items [ ${SELECT} ] submission "later" {}`)).toContain(
      "It takes: individual, simultaneous",
    );
  });

  it("takes a closed set of participant classes", async () => {
    const msg = await errorOf(`items [ ${SELECT} ] participants ["human" "dogs"] {}`);
    expect(msg).toContain('participants: "dogs" is not one of the values `participants` takes');
  });

  it("rejects a repeated participant class", async () => {
    expect(await errorOf(`items [ ${SELECT} ] participants ["human" "human"] {}`)).toContain(
      '"human" is listed twice',
    );
  });

  it("rejects a setting given twice", async () => {
    expect(await errorOf(`items [ ${SELECT} ] title "A" title "B" {}`)).toContain(
      "title: is given twice",
    );
  });

  it("requires the settings chain to end in a record", async () => {
    expect(await errorOf(`items [ ${SELECT} ] title "A" "B"`)).toContain(
      "the activity's settings must end in a record",
    );
  });

  it("is a parse error when the chain is left open", async () => {
    // `title` is arity 2, so an unterminated chain never reaches the compiler. The parser's
    // message is all the author gets, which is the cost of the chained form and the reason
    // instructions.md names these five words explicitly.
    expect(await errorOf(`items [ ${SELECT} ] title "A"`)).toContain("parse error");
  });

  it("refuses results before the end under nonlinear navigation", async () => {
    const msg = await errorOf(`items [ ${SELECT} results [] rank [] ] navigation "nonlinear" {}`);
    expect(msg).toContain("shows them the group's ranking before they have finished");
  });
});

describe("misplaced attributes", () => {
  it("rejects a word the item does not take, and names the legal set", async () => {
    const msg = await errorOf(`items [ ${SELECT} rank [sample 3] ] {}`);
    expect(msg).toContain("rank: `sample` is not an attribute of rank");
    expect(msg).toContain("It takes: prompt, hint, button");
    expect(msg).toContain("`sample` belongs inside `select`");
  });

  it("tells an activity setting written inside an item where it goes", async () => {
    const msg = await errorOf(`items [ select [title "T" sample 10] ] {}`);
    expect(msg).toContain("select: `title` is not an attribute of select");
    expect(msg).toContain("configures the whole activity, so it goes after the items list");
    expect(msg).toContain('items [ … ] title "…" {}');
  });

  it("cannot catch an activity setting written last inside an item", async () => {
    // Arity 2 with nothing following: the parser rejects it before the compiler sees it, so
    // the "goes after the items list" hint cannot fire here. Documented, not fixed.
    expect(await errorOf(`items [ select [sample 10 title "T"] ] {}`)).toContain("parse error");
  });

  it("rejects an attribute given twice", async () => {
    expect(await errorOf(`items [ select [sample 10 sample 4] ] {}`)).toContain(
      "`sample` is given twice",
    );
  });
});
