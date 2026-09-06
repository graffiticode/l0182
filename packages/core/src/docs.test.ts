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
import { readFileSync } from "fs";
import Ajv from "ajv/dist/2020.js";
import { parser } from "@graffiticode/parser";
import { lexicon as base } from "@graffiticode/l0000";
import { ITEM_KINDS, compiler, lexicon, validAttributes } from "./index.js";

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
 * the moment an item kind is added, and a gate that quietly stops covering things is worse
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

  test("the starter template compiles and produces an activity", async () => {
    const out: any = await compileSrc(readFileSync("spec/template.gc", "utf-8"));
    expect(out.activity.items.length).toBeGreaterThan(0);
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

  test("every item kind validates", async () => {
    const out: any = await compileSrc(
      `items [ start [] select [sample 10 max-choices 5] rank [] contribute [optional] results [show-scores show-participants] thanks [] ] title "T" session "s" {}..`,
    );
    expect(out.activity.items.map((i: any) => i.type)).toEqual([...ITEM_KINDS]);
    check(out, "all item kinds");
  });

  test("a participant response validates", async () => {
    const out: any = await compileSrc(`items [ select [sample 10 max-choices 5] rank [] ] {}..`);
    check(
      {
        ...out,
        response: {
          participation: "p1",
          actor: { class: "agent", via: "mcp", host: "claude" },
          item: 1,
          answers: { "0": { selected: ["a", "b"] }, "1": { ranked: ["b", "a"] } },
        },
      },
      "response",
    );
  });

  test("rejects output the compiler could not have produced", async () => {
    const out: any = await compileSrc(`items [ select [sample 10 max-choices 5] ] {}..`);
    out.activity.items[0].nonsense = true;
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

  test("language-info.json's supported_item_types is the item-kind set", () => {
    expect([...info.supported_item_types].sort()).toEqual([...ITEM_KINDS].sort());
  });

  test("every item kind is a container in the lexicon", () => {
    for (const kind of ITEM_KINDS) {
      expect(lexicon[kind], `\`${kind}\` is not in the lexicon`).toBeDefined();
      expect(lexicon[kind].arity).toBe(1);
    }
  });

  test("out_of_scope carries the keywords the MCP router extracts", () => {
    // graffiticode-mcp-server's limitSentences() inlines ONLY sentences matching this pattern
    // into the server instructions. A negative clause without one of these words never reaches
    // the router, and L0180 absorbs survey requests.
    const KEYWORDS = /\b(ONLY when|do NOT|does NOT|are not built|not built yet|EARLY|never)\b/;
    const carrying = scope.out_of_scope.filter((s: string) => KEYWORDS.test(s));
    expect(carrying.length, "no out_of_scope sentence would reach the MCP router").toBeGreaterThan(2);
  });

  test("out_of_scope disclaims assessment, which is the language it would be confused with", () => {
    const text = scope.out_of_scope.join(" ").toLowerCase();
    expect(text).toContain("l0180");
    expect(text).toMatch(/assessment|quiz/);
  });
});
