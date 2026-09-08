// SPDX-License-Identifier: MIT
/**
 * Docs must compile.
 *
 * This is not a documentation nit. The code generator writes from instructions.md and
 * retrieves from examples.md, so a wrong example is reproduced verbatim into generated
 * programs — and unlike a wrong sentence, it is learned.
 *
 * Read paths are relative, so these run with packages/core as the cwd (`npm run -w
 * packages/core test`), which is what the workspace script does.
 */
import { test, describe, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import Ajv from "ajv/dist/2020.js";
import { parser } from "@graffiticode/parser";
import { lexicon as base } from "@graffiticode/l0000";
import { compiler, lexicon, setFetcher, validAttributes } from "./index.js";

// Documented programs use the real `fetch` form, because that is what an author writes and what
// the generator learns from. Serving them from a stub is what keeps this gate a test of our
// parser and our prose rather than of a third party's uptime.
setFetcher(
  async () =>
    ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () =>
        JSON.stringify([
          { id: "a3", text: "protect voting rights" },
          { id: "b7", text: "universal healthcare system" },
          { id: "c1", text: "protect public lands and waters from being sold off" },
          { id: "d9", text: "affordable housing" },
          { id: "e4", text: "remove profit from healthcare" },
          { id: "f2", text: "end Citizens United" },
          { id: "g8", text: "mitigate climate change" },
          { id: "h5", text: "clean air and water" },
          { id: "j7", text: "lower prescription drug prices" },
          { id: "k1", text: "strengthen public schools" },
        ]),
    }) as any,
);

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

async function compileSrc(src: string) {
  const code: any = await parser.parse(182, src, lexicon);
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

  test("the starter template compiles and produces a survey", async () => {
    const out: any = await compileSrc(readFileSync("spec/template.gc", "utf-8"));
    expect(out.survey.ideas.length).toBeGreaterThan(1);
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
      `survey [ name "n" title "T" ideas [{id: "a3" text: "one"} "two" "three"] min-choices 1 max-choices 2
         response [ selection ["a3" "i2"] idea "a new one" ] ]..`,
    );
    expect(out.response).toEqual({ selection: ["a3", "i2"], idea: "a new one" });
    check(out, "a full response");
  });

  test("a survey awaiting a response validates", async () => {
    const out: any = await compileSrc(`survey [ name "n" ideas ["one" "two"] ]..`);
    expect(out.response).toBeUndefined();
    check(out, "no response");
  });

  test("rejects output the compiler could not have produced", async () => {
    const out: any = await compileSrc(`survey [ name "n" ideas ["one" "two"] ]..`);
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

describe("the sample datasets", () => {
  // spec/ideas*.json and spec/ideas*.csv are the sets the example prompts point at, served from
  // raw.githubusercontent.com. A prompt naming one has to be runnable, which holds only while
  // every file is a set L0182 actually accepts — so each is compiled here as a literal.
  //
  // They vary on purpose: records with ids and bare strings, an id column and a text-only CSV,
  // and a quoted field carrying a comma. That spread is the point; a corpus of one shape teaches
  // the generator one shape.
  const files = readdirSync("spec")
    .filter((f) => /^ideas.*\.(json|csv)$/.test(f))
    .sort();

  const read = (f: string): any[] => {
    const text = readFileSync(join("spec", f), "utf-8");
    if (f.endsWith(".json")) return JSON.parse(text);
    const out = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    return out.data as any[];
  };

  const literal = (entry: any) =>
    typeof entry === "string"
      ? JSON.stringify(entry)
      : `{${Object.entries(entry)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(" ")}}`;

  test("there are several, in more than one shape", () => {
    expect(files.length).toBeGreaterThan(3);
    const parsed = files.map(read);
    expect(
      parsed.some((set) => typeof set[0] === "string"),
      "no bare-string set",
    ).toBe(true);
    expect(
      parsed.some((set) => typeof set[0] === "object" && set[0].id),
      "no set with ids",
    ).toBe(true);
    expect(
      parsed.some((set) => typeof set[0] === "object" && !set[0].id),
      "no text-only CSV",
    ).toBe(true);
  });

  for (const f of files) {
    test(`${f} is a set L0182 accepts`, async () => {
      const set = read(f);
      expect(set.length, `${f} has too few ideas`).toBeGreaterThan(1);
      const out: any = await compileSrc(
        `survey [ name "sample" ideas [ ${set.map(literal).join(" ")} ] ]..`,
      );
      expect(out.survey.ideas).toHaveLength(set.length);
    });
  }

  test("ideas.json and ideas.csv are the same set, in the same order", () => {
    expect(read("ideas.csv")).toEqual(read("ideas.json"));
  });

  test("a CSV exercises a quoted field, because an idea will contain a comma", () => {
    const csvs = files.filter((f) => f.endsWith(".csv"));
    expect(csvs.some((f) => /,"[^"]*,[^"]*"/.test(readFileSync(join("spec", f), "utf-8")))).toBe(
      true,
    );
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
