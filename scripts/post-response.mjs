#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * Persist a survey response against an L0182 item, creating the composite
 * `code+data` task the console's task list nests under its root.
 *
 * This is the one step the MCP survey path deliberately does not do. `open_survey`
 * and `answer_survey` reach the proxy only (`/survey/open`, `/survey/answer`), so an
 * agent's participation lives in the collective-intelligence service and nowhere
 * else. The rendered form additionally reports the answer as a `response` action,
 * which the shared View recompiles — and that recompile is what writes the upstream
 * L0000 object. This script is that recompile, for a caller with no browser.
 *
 * Why the two-hop auth: api.graffiticode.org verifies Firebase ID tokens, not raw
 * Graffiticode API keys, so the key is exchanged for a custom token and then signed
 * in. Same sequence as console/src/lib/api-credentials.ts.
 *
 *   node scripts/post-response.mjs <taskId> <response.json>
 *
 * The first argument is the item's TASK id, not its item id — /compile decodes it as
 * base64 of {"taskIds":[...]} and rejects an item id outright. `get_item` returns both;
 * the one wanted here is `task_id`.
 *
 * The JSON file is the `response` value — participation, item cursor, and answers —
 * NOT the whole data object: `response` is a separate key the compiler never emits,
 * which is what lets it survive the recompile that PROG spreads `data` into.
 */
import { readFileSync } from "fs";

/**
 * Production by default, and deliberately NOT via NEXT_PUBLIC_GC_*.
 *
 * Those two are the console's dev-time variables and are routinely set to
 * localhost:4100 / localhost:3100 in a working shell. Reading them here sent a
 * production api key to a local auth service, which has no record of it and
 * answers "invalid api-key" — a message that reads as a bad credential rather
 * than as a request that went to the wrong place. Point somewhere else on
 * purpose, with names that belong to this script.
 */
const AUTH_URL = process.env.GC_AUTH_URL || "https://auth.graffiticode.org";
const API_URL = process.env.GC_API_URL || "https://api.graffiticode.org";
// The task list is a console query, not an api one — same endpoint the MCP server uses.
const CONSOLE_URL = process.env.GC_CONSOLE_URL || "https://console.graffiticode.org/api";

/**
 * --whoami does the two auth hops and stops, printing the uid the api key resolves to.
 *
 * A task is filed under the uid of whoever authenticated, and the console lists
 * tasks(lang, mark) for the signed-in user only. So an api key belonging to a different
 * account than the browser session produces a task that was created perfectly well and
 * is invisible to the person looking for it — indistinguishable, from the console, from
 * one that was never created.
 */
const whoami = process.argv.includes("--whoami");
const introspect = process.argv.includes("--introspect");
const gqlArg = process.argv.indexOf("--gql");
/**
 * --tasks <mark> runs the console's own task-list query as this user.
 *
 * The console lists `tasks(lang, mark)` and nothing else, so "my task is missing" has
 * several indistinguishable causes on that screen: wrong account, wrong mark, or never
 * written. Two of those are answerable here.
 */
const tasksArg = process.argv.indexOf("--tasks");
const dataArg = process.argv.indexOf("--data");
const [taskId, responsePath] = process.argv.slice(2).filter((a) => a !== "--whoami");
if (!whoami && !introspect && gqlArg < 0 && tasksArg < 0 && dataArg < 0 && (!taskId || !responsePath)) {
  console.error("usage: node scripts/post-response.mjs <taskId> <response.json>");
  console.error("       node scripts/post-response.mjs --whoami");
  process.exit(2);
}

const apiKey = process.env.GC_API_KEY_SECRET;
if (!apiKey) {
  console.error("GC_API_KEY_SECRET is not set. It is the raw Graffiticode api key.");
  process.exit(2);
}

// A public client key, not a secret — it is NEXT_PUBLIC_ in the console for that reason.
const firebaseKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  (() => {
    try {
      const env = readFileSync(
        new URL("../../console/.env.local", import.meta.url),
        "utf-8",
      );
      return /^NEXT_PUBLIC_FIREBASE_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");
    } catch {
      return undefined;
    }
  })();
if (!firebaseKey) {
  console.error("NEXT_PUBLIC_FIREBASE_API_KEY is not set and console/.env.local was unreadable.");
  process.exit(2);
}

const readsFile = !whoami && !introspect && gqlArg < 0 && tasksArg < 0 && dataArg < 0;
const response = readsFile ? JSON.parse(readFileSync(responsePath, "utf-8")) : null;

/** api key -> Firebase custom token. */
const authResp = await fetch(`${AUTH_URL}/authenticate/api-key`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: apiKey }),
});
const authData = await authResp.json();
if (authData.status !== "success" || !authData.data?.firebaseCustomToken) {
  console.error(`api-key exchange failed: ${authData.error?.message ?? authResp.status}`);
  process.exit(1);
}

/** Custom token -> ID token, which is what the api actually verifies. */
const fbResp = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: authData.data.firebaseCustomToken, returnSecureToken: true }),
  },
);
const fbData = await fbResp.json();
if (!fbData.idToken) {
  console.error(`firebase sign-in failed: ${fbData.error?.message ?? fbResp.status}`);
  process.exit(1);
}

if (whoami) {
  // The uid is a claim in the ID token; read it rather than making another call.
  const claims = JSON.parse(Buffer.from(fbData.idToken.split(".")[1], "base64url").toString());
  console.log(
    JSON.stringify(
      {
        uid: claims.user_id ?? claims.sub,
        email: claims.email ?? null,
        via_api_key: claims.apiKey ?? claims.firebase?.sign_in_provider ?? null,
        auth_url: AUTH_URL,
        api_url: API_URL,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

/**
 * --data <id> reads a task's stored data back, the way the View does on load.
 *
 * The console's list is not the only place a task can be: `tasks(lang, mark)` returns
 * marked tasks, while a composite minted by a compile carries the response and is
 * addressable by id. Reading it back is what distinguishes "not stored" from
 * "stored but not listed" — two failures that look identical in the UI.
 */
if (dataArg >= 0) {
  const id = process.argv[dataArg + 1];
  const resp = await fetch(`${API_URL}/data?id=${encodeURIComponent(id)}`, {
    headers: { authorization: fbData.idToken },
  });
  const body = await resp.json();
  console.log(JSON.stringify(body, null, 2).slice(0, 2000));
  process.exit(0);
}

// --introspect lists the Query fields the console api exposes. The task list is
// mark-filtered, so an unmarked composite is unreachable through it; this is how to
// find out whether some other query can reach one.
// --gql runs an arbitrary read against the console api as this user. The task list is
// only one of several queries, and the interesting ones (taskVersions) take no mark.
if (gqlArg >= 0) {
  const resp = await fetch(CONSOLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: fbData.idToken },
    body: JSON.stringify({ query: process.argv[gqlArg + 1] }),
  });
  console.log(JSON.stringify(await resp.json(), null, 2).slice(0, 4000));
  process.exit(0);
}

if (introspect) {
  const q = `{ __schema { queryType { fields { name args { name type { name kind ofType { name } } } } } } }`;
  const resp = await fetch(CONSOLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: fbData.idToken },
    body: JSON.stringify({ query: q }),
  });
  const body = await resp.json();
  const fields = body?.data?.__schema?.queryType?.fields;
  if (!fields) {
    console.log(JSON.stringify(body).slice(0, 600));
    process.exit(1);
  }
  for (const f of fields) {
    const args = f.args
      .map((a) => `${a.name}: ${a.type.name ?? a.type.ofType?.name ?? a.type.kind}`)
      .join(", ");
    console.log(`${f.name}(${args})`);
  }
  process.exit(0);
}

if (tasksArg >= 0) {
  const marks = process.argv[tasksArg + 1]
    ? [Number(process.argv[tasksArg + 1])]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const query = `query get($lang: String!, $mark: Int!) {
    tasks(lang: $lang, mark: $mark) { id lang created mark name }
  }`;
  for (const mark of marks) {
    const resp = await fetch(CONSOLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: fbData.idToken },
      body: JSON.stringify({ query, variables: { lang: "0182", mark } }),
    });
    const body = await resp.json();
    const rows = body?.data?.tasks ?? [];
    const err = body?.errors?.[0]?.message;
    console.log(`mark ${mark}: ${err ? `error: ${err}` : `${rows.length} task(s)`}`);
    for (const t of rows.slice(-8)) {
      const when = Number(t.created) ? new Date(Number(t.created)).toISOString() : t.created;
      // A task id is base64 of {"taskIds":[...]}: one entry is code alone, two is
      // code+data — the composite. TasksNav's split on "+" is the older id form and
      // does NOT identify a composite here, so decode instead of pattern-matching.
      let parts = "?";
      try {
        parts = JSON.parse(Buffer.from(String(t.id), "base64").toString()).taskIds.length;
      } catch {
        parts = String(t.id).includes("+") ? `${String(t.id).split("+").length} (legacy)` : "?";
      }
      console.log(`  parts=${parts}  ${when}  ${t.id}`);
    }
  }
  process.exit(0);
}

/**
 * The compile that persists it.
 *
 * `x-graffiticode-storage-type: persistent` is what makes this a stored task rather
 * than an ephemeral compile — without it there is nothing for the console to list.
 *
 * The id is passed through untouched. An earlier version truncated it at the first
 * "+", copying l0000-view's handling of the code+data id form — but a task id here is
 * base64 of {"taskIds":[...]}, and "+" is in the base64 alphabet, so that truncation
 * would silently corrupt roughly one id in sixteen and fail as a decode error.
 */
const compileResp = await fetch(`${API_URL}/compile`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    authorization: fbData.idToken,
    "x-graffiticode-storage-type": "persistent",
  },
  body: JSON.stringify({ id: taskId, data: { response } }),
});
const out = await compileResp.json();
if (out.status !== "success") {
  console.error(`compile failed: ${out.error?.message ?? compileResp.status}`);
  process.exit(1);
}

// The WHOLE response, not out.data: the id of the task just created is a sibling of
// `data`, and printing only the payload discarded the one field a caller needs to go
// find the thing it made.
console.log(JSON.stringify(out, null, 2));
