// SPDX-License-Identifier: MIT
/**
 * `fetch "<url>"` — read a dataset over HTTP at compile time.
 *
 * This is how the idea set gets into a program. The alternative was the console's composition
 * pipeline, `ideas data use "0170"`, and it does not fit: `data use` reads `options.data`, which
 * on this language is nothing at all now — and were it ever the response channel again, the pool
 * and the answer would arrive on one key and fight. A dedicated word evaluates to a value and
 * touches neither.
 *
 * **The fetch happens once, ever.** A Graffiticode task id is content-addressed over code+data,
 * so the API serves a stored compile rather than calling the language again
 * (`graffiticode/packages/api/src/data.js`). A program that fetches its ideas therefore freezes
 * them at first compile — which is the behaviour a survey wants, since a response is only
 * meaningful against the set it was shown. Editing the program is what re-reads the source.
 *
 * Deliberately narrower than L0170's `fetch`, which this is modelled on, in three ways:
 *
 * - **A timeout.** L0170 passes no options to `bent`, so a server that accepts a connection and
 *   dribbles a body holds a compile open indefinitely.
 * - **A scheme and host check.** L0170 hands `String(v0).trim()` straight to the HTTP client with
 *   no validation of any kind, so an authored program can make the language server GET
 *   `http://169.254.169.254/…` — the cloud metadata endpoint — and read the result back out
 *   through the compiled output.
 * - **No type coercion on CSV.** See `parseCsv`.
 *
 * It cannot authenticate, and that is not an oversight to fix casually: a credential would have
 * to be written into the URL, and the URL lives in the task AST, in the compile cache, and in the
 * editor. The dataset endpoint must be public.
 */
import Papa from "papaparse";

/** Long enough for a cold serverless dataset endpoint, short enough that a compile cannot hang. */
const TIMEOUT_MS = 10_000;

/**
 * Test seam, mirroring `setSchemaFetcher` in the base language.
 *
 * `docs.test.ts` compiles every fenced program in `spec/`, and those programs document the real
 * form — a real-looking URL — so without this the documentation gate would depend on the network
 * and on a third party's uptime.
 */
let fetchImpl: typeof fetch = (...args) => fetch(...args);
export function setFetcher(fn?: typeof fetch): void {
  fetchImpl = fn || ((...args) => fetch(...args));
}

/**
 * Hosts a compile must never reach.
 *
 * The language server runs somewhere with a network identity of its own, so an authored URL is an
 * outbound request from inside the deployment. Loopback reaches sibling services; link-local
 * reaches the cloud metadata endpoint, which hands out service-account tokens. Neither can host a
 * public idea set, so refusing them costs nothing.
 */
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^169\.254\./,
  /^metadata\.google\.internal$/i,
];

function assertFetchable(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `fetch: ${JSON.stringify(raw)} is not a URL. Give the full address of the dataset, ` +
        'e.g. fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json".',
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `fetch: ${JSON.stringify(raw)} is not an http or https address. The dataset has to be ` +
        "served over the web; a file path or a data: URL cannot be read here.",
    );
  }
  if (BLOCKED_HOSTS.some((re) => re.test(url.hostname))) {
    throw new Error(
      `fetch: ${url.hostname} is not a host this can read. It is inside the network the ` +
        "language server runs in, not the public web. Publish the dataset at a public address.",
    );
  }
  return url;
}

/**
 * CSV to an array of records, keyed by the header row.
 *
 * `dynamicTyping` is off, and that is load-bearing rather than a default left alone: it would
 * turn an `id` column of "1", "2", "3" into numbers, and an idea's id is a string. A `selection`
 * naming ids and one naming positions are told apart by exactly that distinction, so coercing
 * here would make `selection ["1"]` unresolvable against a set whose ids had silently become
 * numbers.
 */
function parseCsv(text: string): any {
  const out = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (!Array.isArray(out.data) || !out.data.length) {
    throw new Error("no rows");
  }
  return out.data;
}

/**
 * Read and parse a dataset.
 *
 * JSON or CSV, chosen by the response's content type and the URL's suffix, with the other tried
 * if the first fails. Note that CSV parsing almost never throws — a JSON endpoint that answers
 * 200 with an HTML error page parses "successfully" as a one-column table — so JSON is preferred
 * unless something actually says CSV.
 *
 * The suffix half is not a nicety. raw.githubusercontent.com — where the documented sample
 * dataset lives — serves EVERY file as `text/plain`, so for those two addresses the extension is
 * the only thing that distinguishes them.
 */
export async function fetchDataset(raw: string): Promise<any> {
  const url = assertFetchable(raw);

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e: any) {
    const why = e?.name === "TimeoutError" ? `no response in ${TIMEOUT_MS / 1000}s` : e?.message;
    throw new Error(`fetch: could not read ${url} — ${why}.`);
  }

  if (!res.ok) {
    throw new Error(
      `fetch: ${url} answered ${res.status}${res.statusText ? ` ${res.statusText}` : ""}. ` +
        "The dataset has to be readable without credentials — this fetch sends none.",
    );
  }

  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`fetch: ${url} returned nothing.`);
  }

  const type = (res.headers?.get?.("content-type") || "").toLowerCase();
  const csvFirst = type.includes("csv") || (!type.includes("json") && /\.csv(\?|#|$)/i.test(raw));
  const order = csvFirst ? [parseCsv, JSON.parse] : [JSON.parse, parseCsv];

  for (const parse of order) {
    try {
      return parse(text);
    } catch {
      /* try the other form */
    }
  }
  throw new Error(
    `fetch: could not read ${url} as JSON or CSV. It answered with ` +
      `${type || "no content type"} — check the address serves the dataset itself rather than a web page.`,
  );
}
