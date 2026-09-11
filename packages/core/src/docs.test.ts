// SPDX-License-Identifier: MIT
/**
 * Docs must compile.
 *
 * This is not a documentation nit. The code generator writes from instructions.md and
 * retrieves from examples.md, so a wrong example is reproduced verbatim into generated
 * programs — and unlike a wrong sentence, it is learned.
 *
 * Read paths are relative (spec/ and data/), so these run with packages/core as the cwd (`npm run -w
 * packages/core test`), which is what the workspace script does.
 */
import { test, describe, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import Ajv from "ajv/dist/2020.js";
import { parser } from "@graffiticode/parser";
import { lexicon as base } from "@graffiticode/l0000";
import { compiler, lexicon, loadSurvey, validAttributes } from "./index.js";

// Documented programs run against the REAL surveys in data/, with no stub anywhere. A program
// here is exactly what the generator will write, and what it names has to exist — an example
// naming a survey nobody installed, or an idea no version of it holds, is a program that fails
// for every user who copies it.
//
// That is why documented ANSWERS use a survey with a single version: a survey with several
// draws one at random, so a selection written here would match only sometimes.

/** Files whose fenced blocks are programs. examples.md holds prompts and is checked separately. */
const SPEC_FILES = ["spec/spec.md", "spec/instructions.md"];

function blocks(path: string): string[] {
  const out: string[] = [];
  let cur: string[] | null = null;
  for (const l of readFileSync(path, "utf-8").split("\n")) {
    if (l.trim().startsWith("```")) {
      if (cur) {
        out.push(cur.join("\n"));
        cur = null;
      } else cur = [];
      continue;
    }
    if (cur) cur.push(l);
  }
  return out;
}

/**
 * A fenced block that is a program, rather than a table row or a JSON sample.
 *
 * Recognized by the terminator, not by a list of opening words: a list of openers goes stale
 * the moment the vocabulary changes, and a gate that quietly stops covering things is worse
 * than no gate. Every L0182 program ends in `..`.
 */
const isProgram = (src: string): boolean => !!src && src.trim().endsWith("..");

async function compileSrc(src: string, itemId = "docs") {
  // Public values are folded in at parse time, exactly as the console does it, so a documented
  // `session-id get-val-public "itemId"` reaches the compiler as a value.
  const code: any = await parser.parse(182, src, lexicon, {
    GET_VAL_PUBLIC: (name: string) => (name === "itemId" ? itemId : ""),
  });
  const err: any = Object.values(code).find((n: any) => n && n.tag === "ERROR");
  if (err) throw new Error(`parse error: ${JSON.stringify(err.elts)}`);
  return await new Promise((res, rej) =>
    compiler.compile(code, {}, {}, (e: any, v: any) => {
      const errs = Array.isArray(e) ? e.filter(Boolean) : e ? [e] : [];
      if (errs.length) rej(errs);
      else res(v);
    }),
  );
}

describe("spec programs", () => {
  test("no fenced block is silently skipped", () => {
    // Every block is either a program, a JSON sample, or a table/plain fragment. This asserts
    // the classifier still recognizes the programs, so a formatting change cannot quietly
    // empty the suite below.
    for (const f of SPEC_FILES) {
      const all = blocks(f);
      expect(all.length, `${f} has no fenced blocks`).toBeGreaterThan(0);
      const programs = all.filter(isProgram);
      expect(programs.length, `${f} has no programs`).toBeGreaterThan(0);
    }
  });

  test("every program fragment in spec/ compiles, not merely parses", async () => {
    for (const f of SPEC_FILES) {
      for (const src of blocks(f).filter(isProgram)) {
        await expect(compileSrc(src), `${f}:\n${src}`).resolves.toBeTruthy();
      }
    }
  });

  test("the starter template carries the session, which is what holds an answer to its survey", () => {
    // A program that omits it draws again on the turn that answers, and the answer is then
    // checked against ideas its taker never saw.
    expect(readFileSync("spec/template.gc", "utf-8")).toContain(
      'session-id get-val-public "itemId"',
    );
  });

  test("the starter template shows the WHOLE shape, survey and response", async () => {
    // It is what the generator starts from, so a template that stops at the survey teaches half
    // the language — and the half it leaves out is the one a client always has to produce.
    const out: any = await compileSrc(readFileSync("spec/template.gc", "utf-8"));
    expect(out.survey.ideas.length).toBeGreaterThan(1);
    expect(out.response.selection.length).toBeGreaterThan(0);
    expect(out.response.idea).toBeTruthy();
  });

  test("the starter template leaves the choice bounds to their defaults", () => {
    // Pinning them taught the generator to always write them, and the numbers it copied were
    // not even the defaults.
    const src = readFileSync("spec/template.gc", "utf-8");
    expect(src).not.toMatch(/min-choices|max-choices/);
  });

  test("the starter template names its ideas by text, not by id or position", async () => {
    // The ideas live in the survey, so whoever writes the response has not seen an id or a
    // position. Copying a positional selection out of here is exactly the mistake that shipped.
    const src = readFileSync("spec/template.gc", "utf-8");
    const selection = src.match(/selection \[([^\]]*)\]/)?.[1] ?? "";
    expect(selection.trim()).toBeTruthy();
    expect(selection).not.toMatch(/\d/);
  });
});

describe("spec and lexicon agree", () => {
  /** Words in a `| \`word\` | \`<sig>\` | … |` table row. */
  function documentedWords(path: string): string[] {
    const out = new Set<string>();
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const m = line.match(/^\|\s*`([a-z-]+)`\s*\|\s*`(<[^`]*>)`\s*\|/);
      if (m) out.add(m[1]);
    }
    return [...out];
  }

  // The base language documents its own vocabulary; ours is whatever L0182 added on top of it.
  // Derived rather than listed, so adding a word cannot silently escape the documentation gate.
  const dialect = Object.keys(lexicon).filter((w) => !(w in base));

  test("every word documented in spec/ exists in the lexicon", () => {
    for (const f of SPEC_FILES) {
      for (const w of documentedWords(f)) {
        expect(lexicon[w], `${f} documents \`${w}\`, which is not in the lexicon`).toBeDefined();
      }
    }
  });

  test("every L0182 word is documented in instructions.md", () => {
    const documented = documentedWords("spec/instructions.md");
    const undocumented = dialect.filter((w) => !documented.includes(w));
    expect(undocumented, `in the lexicon but undocumented: ${undocumented.join(", ")}`).toEqual([]);
  });

  test("the signature in the docs matches the one in the lexicon", () => {
    for (const f of SPEC_FILES) {
      for (const line of readFileSync(f, "utf-8").split("\n")) {
        const m = line.match(/^\|\s*`([a-z-]+)`\s*\|\s*`(<[^`]*>)`\s*\|/);
        if (!m || !lexicon[m[1]]) continue;
        expect(lexicon[m[1]].type, `${f}: \`${m[1]}\` signature drift`).toBe(m[2]);
      }
    }
  });
});

describe("schema.json describes what the compiler actually emits", () => {
  // schema.json is served to agents and to the console as the contract for compiled output.
  // Validated against REAL compiled output, so `additionalProperties: false` catches a field
  // the compiler emits and the schema never learned about.
  const schema = JSON.parse(readFileSync("spec/schema.json", "utf-8"));
  const ajv = new (Ajv as any)({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);

  const check = (out: any, where: string) => {
    const ok = validate(out);
    expect(ok, `${where}: ${ajv.errorsText(validate.errors)}`).toBe(true);
  };

  test("every fenced spec program's compiled output validates", async () => {
    for (const f of SPEC_FILES) {
      for (const src of blocks(f).filter(isProgram)) {
        check(await compileSrc(src), `${f}:\n${src}`);
      }
    }
  });

  test("a survey with a full response validates", async () => {
    const out: any = await compileSrc(
      `survey [ id "team-retro-1" session-id get-val-public "itemId"
         response [ selection ["t3" "cut the build time in half"] idea "a new one" ] ]..`,
    );
    expect(out.response).toEqual({ selection: ["t3", "t2"], idea: "a new one" });
    expect(out.survey.sessionId).toBe("docs");
    check(out, "a full response");
  });

  test("a survey awaiting a response validates", async () => {
    const out: any = await compileSrc(`survey [ id "team-retro-1" ]..`);
    expect(out.response).toBeUndefined();
    check(out, "no response");
  });

  test("rejects output the compiler could not have produced", async () => {
    const out: any = await compileSrc(`survey [ id "team-retro-1" ]..`);
    out.survey.nonsense = true;
    expect(validate(out), "additionalProperties:false is not doing its job").toBe(false);
  });
});

describe("the container tables match validAttributes", () => {
  // The generator reads this table to decide where a word goes; the compiler rejects on
  // validAttributes. If they disagree, the docs teach a program the compiler refuses.
  test("instructions.md lists exactly the words each container accepts", () => {
    const text = readFileSync("spec/instructions.md", "utf-8");
    // Scoped to its own section — the tables above have identically shaped rows.
    const section = text.split(/^## Which words each container takes$/m)[1]?.split(/^## /m)[0];
    expect(section, "instructions.md is missing the container-table section").toBeTruthy();
    for (const [container, allowed] of Object.entries(validAttributes)) {
      const row = section!.match(
        new RegExp(`^\\|\\s*\`${container}\`\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, "m"),
      );
      expect(row, `no container row for \`${container}\``).toBeTruthy();
      const documented = row![1]
        .split(",")
        .map((s) => s.trim())
        .sort();
      expect(documented, `\`${container}\` row disagrees with validAttributes`).toEqual(
        [...allowed].sort(),
      );
    }
  });
});

describe("the surveys installed in data/", () => {
  // These are what `id "…"` reaches, so each one has to be a survey L0182 actually accepts —
  // compiled here as a program, the same way a taker reaches it. A file that stops being a
  // valid set fails the build rather than somebody's first prompt.
  //
  // They vary on purpose: records with ids and bare strings, an id column and a text-only CSV,
  // and a quoted field carrying a comma. That spread is the point; a corpus of one shape teaches
  // the generator one shape.
  const files = readdirSync("data").sort();
  const instances = files.map((f) => f.replace(/\.(json|csv)$/, ""));

  /** The ideas themselves, whether the file is a bare list or an envelope with title/instructions. */
  const read = (f: string): any[] => {
    const text = readFileSync(join("data", f), "utf-8");
    if (f.endsWith(".json")) {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : parsed.ideas;
    }
    const out = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    return out.data as any[];
  };

  /** The envelope keys, or null for a bare list. */
  const envelope = (f: string): any =>
    f.endsWith(".json")
      ? (() => {
          const p = JSON.parse(readFileSync(join("data", f), "utf-8"));
          return Array.isArray(p) ? null : p;
        })()
      : null;

  test("every file is a version of some survey", () => {
    // `<id>-<n>` is the whole naming rule, and a file outside it is invisible to `id "…"` —
    // installed, never reachable, and silent about it.
    expect(files.length).toBeGreaterThan(3);
    for (const f of files)
      expect(f, `${f} is not <survey-id>-<n>.json|csv`).toMatch(
        /^[a-z0-9][a-z0-9-]*-\d+\.(json|csv)$/,
      );
  });

  test("at least one survey has several versions, which is what the draw is for", async () => {
    const byId = new Map<string, number>();
    for (const i of instances) {
      const id = i.replace(/-\d+$/, "");
      byId.set(id, (byId.get(id) || 0) + 1);
    }
    expect(
      [...byId.values()].some((n) => n > 1),
      "no survey has more than one version",
    ).toBe(true);
  });

  test("the shapes vary, because a corpus of one shape teaches one shape", () => {
    const sets = files.map(read);
    expect(
      sets.some((set) => typeof set[0] === "string"),
      "no bare-string set",
    ).toBe(true);
    expect(
      sets.some((set) => typeof set[0] === "object" && set[0].id),
      "no set with ids",
    ).toBe(true);
    expect(
      sets.some((set) => typeof set[0] === "object" && !set[0].id),
      "no text-only CSV",
    ).toBe(true);
  });

  for (const instance of instances) {
    test(`${instance} is a survey L0182 accepts`, async () => {
      const file = files.find((f) => f.startsWith(`${instance}.`))!;
      const set = read(file);
      expect(set.length, `${file} has too few ideas`).toBeGreaterThan(1);
      // Named outright, so this reads the file under test rather than drawing a sibling.
      const out: any = await compileSrc(`survey [ id "${instance}" ]..`);
      expect(out.survey.instance).toBe(instance);
      expect(out.survey.ideas).toHaveLength(set.length);
    });
  }

  test("a survey id reaches one of its versions", async () => {
    const loaded = await loadSurvey("you-can-choose", {});
    expect(instances).toContain(loaded.instance);
  });

  // The words a participant reads are part of the survey, not an afterthought: a program that
  // names a survey and says nothing else must still produce a page with a heading and an
  // explanation. A JSON survey that lost its envelope would silently go back to a bare list.
  test("every JSON survey carries a title and instructions", () => {
    const jsons = files.filter((f) => f.endsWith(".json"));
    expect(jsons.length).toBeGreaterThan(3);
    for (const f of jsons) {
      const env = envelope(f);
      expect(env, `${f} is a bare list, not an envelope`).not.toBeNull();
      expect(typeof env.title, `${f} has no title`).toBe("string");
      expect(env.title.trim().length, `${f} has an empty title`).toBeGreaterThan(0);
      expect(typeof env.instructions, `${f} has no instructions`).toBe("string");
      expect(env.instructions.trim().length, `${f} has empty instructions`).toBeGreaterThan(20);
    }
  });

  test("a CSV exercises a quoted field, because an idea will contain a comma", () => {
    const csvs = files.filter((f) => f.endsWith(".csv"));
    expect(
      csvs.some((f) => /(^|,)"[^"]*,[^"]*"/m.test(readFileSync(join("data", f), "utf-8"))),
    ).toBe(true);
  });

  test("every survey the docs name is installed", () => {
    // A documented id that nobody installed is a program that fails for whoever copies it.
    const docs = [
      readFileSync("spec/instructions.md", "utf-8"),
      readFileSync("spec/spec.md", "utf-8"),
      readFileSync("spec/examples.md", "utf-8"),
      readFileSync("spec/usage-guide.md", "utf-8"),
      readFileSync("spec/template.gc", "utf-8"),
    ].join("\n");
    const ids = new Set<string>();
    for (const m of docs.matchAll(/\bid "([a-z0-9][a-z0-9-]*)"/g)) ids.add(m[1]);
    expect(ids.size, "the docs name no survey at all").toBeGreaterThan(1);
    for (const id of ids) {
      const exists = instances.some((i) => i === id || i.replace(/-\d+$/, "") === id);
      expect(exists, `the docs name \`${id}\`, which is not installed in data/`).toBe(true);
    }
  });
});

describe("examples.md numbering is coherent", () => {
  const text = readFileSync("spec/examples.md", "utf-8");
  const lines = text.split("\n");
  const numbered = lines
    .map((l) => l.match(/^(\d+)\.\s+\S/))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  const headers = lines
    .map((l) => l.match(/^##\s+Category\s+(\d+):\s+.*\((\d+)[–-](\d+)\)\s*$/))
    .filter(Boolean)
    .map((m) => ({ n: Number(m![1]), from: Number(m![2]), to: Number(m![3]) }));

  test("prompts run 1..N with no gaps or repeats", () => {
    expect(numbered.length).toBeGreaterThan(0);
    expect(numbered).toEqual(Array.from({ length: numbered.length }, (_, i) => i + 1));
  });

  test("categories are numbered in order and their ranges tile the whole list", () => {
    expect(headers.map((h) => h.n)).toEqual(headers.map((_, i) => i + 1));
    expect(headers[0].from).toBe(1);
    expect(headers[headers.length - 1].to).toBe(numbered.length);
    for (let i = 1; i < headers.length; i++) {
      expect(headers[i].from, `category ${headers[i].n} does not follow ${headers[i - 1].n}`).toBe(
        headers[i - 1].to + 1,
      );
    }
  });

  test("the count stated in the preamble is the count actually present", () => {
    const stated = text.match(/^(\d+) example prompts/m);
    expect(stated, "examples.md should open with 'N example prompts'").toBeTruthy();
    expect(Number(stated![1])).toBe(numbered.length);
  });
});

describe("scope.json and language-info.json know which items exist", () => {
  const scope = JSON.parse(readFileSync("spec/scope.json", "utf-8"));
  const info = JSON.parse(readFileSync("spec/language-info.json", "utf-8"));

  test("both files claim the same dialect", () => {
    expect(scope.id).toBe("0182");
    expect(info.id).toBe("0182");
  });

  test("language-info.json's supported_item_types is the container set", () => {
    expect([...info.supported_item_types].sort()).toEqual(Object.keys(validAttributes).sort());
  });

  test("every container is in the lexicon at arity 1", () => {
    for (const container of Object.keys(validAttributes)) {
      expect(lexicon[container], `\`${container}\` is not in the lexicon`).toBeDefined();
      expect(lexicon[container].arity).toBe(1);
    }
  });

  test("out_of_scope carries the keywords the MCP router extracts", () => {
    // graffiticode-mcp-server's limitSentences() inlines ONLY sentences matching this pattern
    // into the server instructions. A negative clause without one of these words never reaches
    // the router, and L0180 absorbs survey requests.
    const KEYWORDS = /\b(ONLY when|do NOT|does NOT|are not built|not built yet|EARLY|never)\b/;
    const carrying = scope.out_of_scope.filter((s: string) => KEYWORDS.test(s));
    expect(carrying.length, "no out_of_scope sentence would reach the MCP router").toBeGreaterThan(
      2,
    );
  });

  test("out_of_scope disclaims assessment, which is the language it would be confused with", () => {
    const text = scope.out_of_scope.join(" ").toLowerCase();
    expect(text).toContain("l0180");
    expect(text).toMatch(/assessment|quiz/);
  });
});
