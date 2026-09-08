// SPDX-License-Identifier: MIT
/**
 * What PROG does with the `data` it is handed back on a round trip.
 *
 * The shapes below are not hypothetical: they are what `GET /data?id=` returns for a real
 * task after a response has been posted. Compiled data is stored as the `{ data, errors }`
 * envelope the api package emits, so the model that went in is not the shape that comes back.
 */
import { describe, expect, it } from "vitest";
import { parser } from "@graffiticode/parser";
import { compiler, lexicon } from "./index.js";

const SRC = `items [ select [ prompt "P" sample 10 ] rank [] ] title "T" {}..`;

/** Compile with an explicit `data`, the way a round trip does. */
async function compileWith(data: any): Promise<any> {
  const code: any = await parser.parse(182, SRC, lexicon);
  return await new Promise((resolve, reject) =>
    compiler.compile(code, data, {}, (e: any, v: any) => {
      const errs = Array.isArray(e) ? e.filter(Boolean) : e ? [e] : [];
      errs.length ? reject(errs) : resolve(v);
    }),
  );
}

const RESPONSE = { participation: "p-1", item: 2, answers: { "0": { selected: ["i1"] } } };

describe("PROG and the data it gets back", () => {
  it("keeps a bare response at the top level, where the Form reads it", async () => {
    const out = await compileWith({ response: RESPONSE });
    expect(out.response).toEqual(RESPONSE);
    expect(out.activity.items).toHaveLength(2);
  });

  it("reads the response through the { data, errors } envelope storage returns", async () => {
    // Without unwrapping this lands as { data: { response }, errors: [] } and Form.tsx's
    // state.data.response is undefined — a survey that silently will not resume.
    const out = await compileWith({ data: { response: RESPONSE }, errors: [] });
    expect(out.response).toEqual(RESPONSE);
    expect(out.data).toBeUndefined();
    expect(out.errors).toBeUndefined();
  });

  it("reads it through a doubly wrapped envelope", async () => {
    // Observed after a second round trip against the same task.
    const out = await compileWith({ data: { data: { response: RESPONSE }, errors: [] }, errors: [] });
    expect(out.response).toEqual(RESPONSE);
  });

  it("still lets the fresh activity win over a stale one carried in data", async () => {
    const out = await compileWith({
      data: { response: RESPONSE, activity: { title: "STALE", items: [] } },
      errors: [],
    });
    expect(out.activity.title).toBe("T");
    expect(out.activity.items).toHaveLength(2);
  });

  it("survives data that is absent, empty, or not an object", async () => {
    for (const d of [undefined, {}, null, "nope", []]) {
      const out = await compileWith(d as any);
      expect(out.activity.items).toHaveLength(2);
      expect(out.response).toBeUndefined();
    }
  });
});
