// SPDX-License-Identifier: MIT
/**
 * `fetch "<url>"`, end to end through the compiler.
 *
 * Nothing here touches the network: `setFetcher` swaps the implementation, which is the same seam
 * the base language exposes for its own compile-time schema fetch. A test that reached a real URL
 * would make the suite depend on a third party's uptime to tell us whether our parser works.
 */
import { afterEach, describe, expect, it } from "vitest";
import { setFetcher } from "./fetch.js";
import { compile, errorOf } from "./harness.js";

/** A stub response. `body` may be a string, or an object which is sent as JSON. */
const serve = (body: any, over: { status?: number; type?: string } = {}) => {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const type = over.type ?? (typeof body === "string" ? "text/plain" : "application/json");
  setFetcher(
    async () =>
      ({
        ok: (over.status ?? 200) < 400,
        status: over.status ?? 200,
        statusText: "",
        headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? type : null) },
        text: async () => text,
      }) as any,
  );
};

/** Fail the fetch itself, the way a dead host or a timeout does. */
const refuse = (err: Error) => {
  setFetcher(async () => {
    throw err;
  });
};

const SRC = (url = "https://example.org/ideas.json") =>
  `survey [ name "you-can-choose" ideas fetch "${url}" ]`;

afterEach(() => setFetcher());

describe("fetching a JSON dataset", () => {
  it("reads a list of plain strings", async () => {
    serve(["clean air and water", "affordable housing"]);
    const out = await compile(SRC());
    expect(out.survey.ideas).toEqual([
      { id: "i0", text: "clean air and water" },
      { id: "i1", text: "affordable housing" },
    ]);
  });

  it("reads records and keeps the service's ids", async () => {
    serve([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
    const out = await compile(SRC());
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });

  it("ignores columns the language has no use for", async () => {
    serve([
      { id: "a3", text: "one", votes: 41, author: "someone" },
      { id: "b7", text: "two", votes: 12, author: "someone else" },
    ]);
    const out = await compile(SRC());
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "one" },
      { id: "b7", text: "two" },
    ]);
  });

  it("lets a fetched set be selected from BY TEXT, which is the only key the author knows", async () => {
    // The whole point. Code generation writes the response before the program has ever compiled,
    // so it has seen the URL and nothing else — no ids, no positions. Naming a position here is
    // a guess, and a guess in range compiles clean and records the wrong ideas.
    serve([
      { id: "a3", text: "protect voting rights" },
      { id: "d9", text: "affordable housing" },
      { id: "h5", text: "clean air and water" },
    ]);
    const out = await compile(
      `survey [ name "n" ideas fetch "https://example.org/ideas.json"
         response [ selection ["affordable housing" "clean air and water"] ] ]`,
    );
    expect(out.response.selection).toEqual(["d9", "h5"]);
  });

  it("refuses text the fetched set does not contain, rather than recording something else", async () => {
    serve([
      { id: "a3", text: "protect voting rights" },
      { id: "d9", text: "affordable housing" },
    ]);
    const msg = await errorOf(
      `survey [ name "n" ideas fetch "https://example.org/ideas.json"
         response [ selection ["cheaper housing"] ] ]`,
    );
    expect(msg).toContain("not an idea in this survey");
  });

  it("lets a fetched set be selected from, by id or by position", async () => {
    serve([
      { id: "a3", text: "one" },
      { id: "b7", text: "two" },
    ]);
    const out = await compile(
      `survey [ name "n" ideas fetch "https://example.org/ideas.json" max-choices 2
         response [ selection [1 "a3"] ] ]`,
    );
    expect(out.response.selection).toEqual(["b7", "a3"]);
  });
});

describe("fetching a CSV dataset", () => {
  const CSV = 'id,text\na3,"clean air and water"\nb7,"affordable housing"\n';

  it("keys rows by the header row", async () => {
    serve(CSV, { type: "text/csv" });
    const out = await compile(SRC("https://example.org/ideas.csv"));
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "clean air and water" },
      { id: "b7", text: "affordable housing" },
    ]);
  });

  it("handles a comma inside a quoted field, which an idea will have", async () => {
    serve('id,text\na3,"clean air, and water"\nb7,housing\n', { type: "text/csv" });
    const out = await compile(SRC("https://example.org/ideas.csv"));
    expect(out.survey.ideas[0].text).toBe("clean air, and water");
  });

  it("does NOT coerce a numeric id into a number", async () => {
    // dynamicTyping would make these ids 1 and 2, and an id is a string — `selection ["1"]` names
    // an id while `selection [1]` names a position, so the two must stay distinguishable.
    serve("id,text\n1,one\n2,two\n", { type: "text/csv" });
    const out = await compile(SRC("https://example.org/ideas.csv"));
    expect(out.survey.ideas.map((i: any) => i.id)).toEqual(["1", "2"]);
  });

  it("reads CSV from a .csv address even when the content type is unhelpful", async () => {
    serve(CSV, { type: "application/octet-stream" });
    const out = await compile(SRC("https://example.org/ideas.csv"));
    expect(out.survey.ideas).toHaveLength(2);
  });

  it("reads CSV announced by content type from an address with no suffix", async () => {
    serve(CSV, { type: "text/csv; charset=utf-8" });
    const out = await compile(SRC("https://example.org/surveys/you-can-choose/ideas"));
    expect(out.survey.ideas).toHaveLength(2);
  });
});

describe("a host that types everything text/plain", () => {
  // raw.githubusercontent.com does exactly this, and it is where the documented sample dataset
  // lives — so the suffix fallback is not a nicety here, it is the whole discriminator. Both
  // cases below would be indistinguishable without it.
  it("reads a .csv address as CSV", async () => {
    serve("id,text\na3,one\nb7,two\n", { type: "text/plain; charset=utf-8" });
    const out = await compile(SRC("https://raw.githubusercontent.com/o/r/main/ideas.csv"));
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "one" },
      { id: "b7", text: "two" },
    ]);
  });

  it("reads a .json address as JSON", async () => {
    serve('[{"id":"a3","text":"one"},{"id":"b7","text":"two"}]', {
      type: "text/plain; charset=utf-8",
    });
    const out = await compile(SRC("https://raw.githubusercontent.com/o/r/main/ideas.json"));
    expect(out.survey.ideas).toEqual([
      { id: "a3", text: "one" },
      { id: "b7", text: "two" },
    ]);
  });
});

describe("when the dataset is not a set of ideas", () => {
  it("reports it as `ideas`, which is the word the author has to fix", async () => {
    serve({ ideas: ["one", "two"] });
    const msg = await errorOf(SRC());
    expect(msg).toContain("ideas: expected a list of ideas");
  });

  it("names the row that is malformed", async () => {
    serve(["fine", { id: "b7" }]);
    expect(await errorOf(SRC())).toContain("entry 2 has no `text`");
  });

  it("still refuses a set of one, however it arrived", async () => {
    serve(["only this"]);
    expect(await errorOf(SRC())).toContain("only one idea");
  });
});

describe("when the fetch fails", () => {
  it("names the status, and says why no credential was sent", async () => {
    serve("nope", { status: 401 });
    const msg = await errorOf(SRC());
    expect(msg).toContain("answered 401");
    expect(msg).toContain("readable without credentials");
  });

  it("names a timeout as a timeout", async () => {
    const e = new Error("aborted");
    e.name = "TimeoutError";
    refuse(e);
    expect(await errorOf(SRC())).toContain("no response in 10s");
  });

  it("reports a dead host", async () => {
    refuse(new Error("getaddrinfo ENOTFOUND example.org"));
    expect(await errorOf(SRC())).toContain("could not read");
  });

  it("reports an empty body rather than an empty survey", async () => {
    serve("   ");
    expect(await errorOf(SRC())).toContain("returned nothing");
  });

  it("reports a page that is neither JSON nor CSV", async () => {
    // A 200 carrying an HTML error page is the failure most likely to be mistaken for success.
    serve("<!doctype html><html><body>Sign in</body></html>", { type: "text/html" });
    const msg = await errorOf(SRC());
    expect(msg).toContain("as JSON or CSV");
    expect(msg).toContain("rather than a web page");
  });
});

describe("what the fetch refuses to reach", () => {
  // No request is made for any of these, so the stub is irrelevant — the URL is rejected first.
  it("refuses the cloud metadata endpoint", async () => {
    const msg = await errorOf(SRC("http://169.254.169.254/computeMetadata/v1/"));
    expect(msg).toContain("inside the network the language server runs in");
  });

  it("refuses loopback", async () => {
    expect(await errorOf(SRC("http://localhost:8080/ideas"))).toContain(
      "is not a host this can read",
    );
    expect(await errorOf(SRC("http://127.0.0.1/ideas"))).toContain("is not a host this can read");
  });

  it("refuses a scheme that is not http or https", async () => {
    expect(await errorOf(SRC("file:///etc/passwd"))).toContain("not an http or https address");
  });

  it("refuses something that is not a URL at all", async () => {
    expect(await errorOf(SRC("ideas.json"))).toContain("is not a URL");
  });

  it("shows a real address in that message, not a placeholder", async () => {
    // The generator reads a compile error and retries against it, so an example URL here is one
    // it will copy. example.org/... 404s, which turns a fixable error into a different one.
    const msg = await errorOf(SRC("ideas.json"));
    expect(msg).toContain("raw.githubusercontent.com/graffiticode/l0182");
    expect(msg).not.toContain("example.org");
  });
});
