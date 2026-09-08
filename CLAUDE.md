# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this is

L0182 is a Graffiticode dialect for **collective-intelligence surveys**. A program is a named
set of ideas someone is asked to choose between, and — once something has answered — the
response to it: the ideas chosen in priority order, plus one new idea that was not in the set.

Three commitments the rest of the design follows from:

- **The flow is not in the language.** L0182 describes no screens, steps, ordering, navigation
  or submission, and there is no player anywhere in this repo. Anything that would reintroduce
  a survey-taking flow here is the wrong direction; that belongs to a different language or a
  different client reading this record.
- **The ideas are injected at code generation.** They are resolved from the survey's `name`
  against the service that holds the pool — through an **L0170 `fetch`**, which is the generic
  service-caller — and inlined into the program text. L0182 never touches a network and holds no
  pool.
- **The code is the interface.** A person writes the response in the console's editor; an agent
  writes it through `update_item`. They are the same client, so both produce the identical
  record and there is nothing to keep in parity. The view only renders it.

This repo previously held a survey proxy, an in-memory mock backend, an adaptive sampler and a
five-screen React player. All of it is gone — see "What was deleted, and why it is not coming
back" before proposing anything that resembles it.

## Commands

```bash
npm run build      # core → build-static → api → view → view:embed → assemble
npm run dev        # API on :50182 (expects Firestore emulator :8080, local auth :4100)
npm run start      # the built API server
npm test           # core + api + view suites
npm run lint       # ESLint over the monorepo (npm run lint:fix to write)
npm run format     # Prettier over the monorepo (printWidth 100, double quotes)
npm run publish    # core AND view to npm — both are published packages
npm run gcp:build  # submits cloudbuild.yaml, the path that carries the deploy rules
npm run gcp:deploy # Cloud Run as l0182, us-central1 — but read "Deploying" first
npm run gcp:logs   # Cloud Run logs for l0182

npm run -w packages/view dev   # the renderer on Vite alone; /dev.html is the fixture page
```

Node 22 (`.nvmrc`, and `engines` refuses lower), npm workspaces.

`npm run assemble` wipes and repopulates `packages/api/static/` from `core/dist/static` and
`view/dist-embed`. It is not incremental — a stale file cannot survive it, which is the point.

Tests are Vitest, colocated as `*.test.ts`, and there is no root config — each workspace runs
its own. **The core suite must run with `packages/core` as the cwd**, which the workspace script
does: `docs.test.ts` reads `spec/*` by relative path.

Run one file, or one case, through that same workspace script for the same reason — `npx vitest`
from the root has the wrong cwd:

```bash
npm run -w packages/core test -- src/survey.test.ts
npm run -w packages/core test -- src/survey.test.ts -t "selection"
```

Core tests compile through `src/harness.ts` — `compile(src)` and `errorOf(src)`, which run the
real parser against the real lexicon and append the `..` terminator if it is missing. A new test
that wires the parser itself is doing by hand what every other test gets from there.

**`packages/api`'s suite reads the assembled `static/` directory**, so `npm run build` has to
have run at least once or `app.test.ts` fails on a missing asset rather than on anything real.

### Environment

| Variable   | Default                         | Purpose                    |
| ---------- | ------------------------------- | -------------------------- |
| `PORT`     | `50182`                         | The language server's port |
| `AUTH_URL` | `https://auth.graffiticode.org` | Token verification         |

That is the whole environment. There is no service URL and no credential: everything a program
needs is in the program.

### Deploying

Two rules hold the deployed service together, and all three Cloud Build configs carry both —
`cloudbuild.yaml` (what `npm run gcp:build` submits), plus `cloudbuild.production.yaml` and
`cloudbuild.staging.yaml` (the GitHub triggers described in `GITHUB_DEPLOYMENT.md`). **A new
deploy path has to carry them too:**

- **`--update-env-vars`, never `--set-env-vars`.** `set` replaces the whole environment, so any
  variable added out of band is silently deleted by the next deploy.
- **`--max-instances=$_MAX_INSTANCES`, set explicitly and never merely omitted.** Cloud Run
  carries the service's current scaling forward when the flag is absent, and this service was
  pinned to `--max-instances=1` for as long as it ran the in-memory mock backend. Nothing holds
  state between requests now, but _dropping_ the flag would leave that pin of 1 in place
  indefinitely — which is why the substitution was restored rather than the flag deleted.
  Default 20, matching the sibling languages.

`npm run gcp:deploy` builds from source and passes neither flag. On an existing service Cloud
Run carries the current scaling and environment forward, so it is safe for a code-only push and
cannot be used to change either.

## Architecture

Three workspaces on the published `@graffiticode/l0000` and `@graffiticode/l0000-view`.

- **`packages/core`** (`@graffiticode/l0182`) — the language. `attributes.ts` is the vocabulary
  as data; `lexicon.ts` and `compiler.ts` both generate from it; `survey.ts` is the assembly and
  every rule; `spec/` is what agents read.
- **`packages/api`** (`@graffiticode/api-l0182`, private) — Express: `POST /compile`, `GET /form`,
  a health check at `/`, and the assembled static assets. Its middleware order and cache headers
  are load-bearing — see "What `app.ts` serves".
- **`packages/view`** (`@graffiticode/l0182-view`) — the renderer.

### One attribute table, and no arity-2 words at all

`attributes.ts` holds one row per word, and the lexicon entry, the Checker method and the
Transformer method are all generated from it — arity included, so a word can never be declared
with one arity and handled with another. **Never hand-write an attribute handler.**

Every word is arity 1. Only the two containers (`survey`, `response`) and `PROG` are written out.

The language used to carry a second table of arity-2 chaining words that configured an activity
from outside its brackets, and that shape had a trap the compiler could never see: a config word
written as the last word inside an item satisfied its own arity by swallowing the closing
bracket, so the program died in the parser with "Too few arguments" rather than with anything a
generator could act on. **Do not reintroduce chaining.** If a word ever needs to sit outside the
brackets again, reconsider the shape first.

The style is attribute lists, per `console/docs/language-authoring-style.md` — the canonical
spec for authoring a Graffiticode dialect. Read it before adding vocabulary.

### `response` nests in the source and is lifted in the output

`PROG` takes the program's **last** expression (`compiler.ts`), so a program written as two
top-level expressions would silently discard the first. That is why `response [...]` is written
inside `survey`'s attribute list — it evaluates to a single-key record like any attribute, and
the list merges it — and why `buildSurvey` then lifts it back out to the top level. It is not
part of the survey; it is an answer to one, and anything reading the output must be able to tell
them apart.

### Value validation goes in the Transformer, never the Checker

`Checker.LIST` (inherited from L0000) visits only `elts[0]`. A rule written as a Checker method
therefore fires on the first element of a list and nowhere else — in a style built on lists,
almost nowhere. L0166 shipped a Checker rule rejecting negative points that silently did nothing
for exactly this reason. The generated Checker methods here walk the tree and do not judge.

### The compiler is the only enforcement there is

This is the load-bearing consequence of deleting the player. Nothing at delivery time can hold a
response inside the authored bounds, so `survey.ts` checks more than a form-backed language
would need to: every `selection` id exists in the set, none repeats, the count is within
`min-choices`/`max-choices`, and `idea` does not repeat something already in the set. Removing
one of those does not degrade a warning — it makes a meaningless record compile.

### Error messages are a product surface

The generator is an LLM that reads a compile error and tries again, so the wording is not a
diagnostic. Every message names the fix:

> survey: `max-choices` (9) is more than the 3 ideas in the set, so there are never enough ideas
> to pick that many. Add ideas or lower `max-choices`.

The tests assert on that text, not merely that compilation failed. A message that stops naming
the fix is a regression even when the program still errors.

### A selection may name an idea by position, but only when the set has no ids

`selection` takes an id or a **0-based position**, and `resolveResponse` normalises both to ids
before they reach the output — so the compiled record is identical either way and the input form
costs nothing downstream.

Two things about the rule are load-bearing:

- **Positions are refused when any idea carries an authored id**, including a set where only some
  do. The id is what the originating service understands, so a positional selection could not be
  handed back to it; resolving one anyway would produce a record that means nothing there.
- **0-based, not 1-based**, because the language already derives `i0`, `i1`, … by position for a
  set that has none — a position *is* the number in the derived id, and making the two disagree
  would be gratuitous. Both range messages say where counting starts, because an off-by-one here
  does not fail: it records a different ranking than the one that was meant.

### Ideas keep the service's ids when they have them

`ideas` accepts a bare string or a `{id, text}` record. An entry that names its own id keeps it;
one that does not is numbered positionally, `i0` upward. Both forms exist for one reason: code
generation inlines whatever the L0170 fetch returned, and when that carried ids they have to
survive into `selection`, because a selection of positional ids means nothing back at the
service the set came from.

### `PROG` ignores `options.data`, deliberately

It used to spread it, because the React player wrote the participant's answer back through it on
every recompile. That forced the compiler to unwrap the `{data, errors}` envelope storage wraps
a stored model in — **in a loop**, because a second layer was observed appearing after the first
round trip. That envelope drew blood three times across this codebase: it buried the response
one level below where the Form read it (a survey that silently would not resume), `l0000-view`
normalises it in `ne()`, and `graffiticode-mcp-server` rejected every survey as "not a survey"
for reading `.activity` off it.

Nothing writes back now, so the compiled value is the whole model and the envelope cannot reach
it. `prog.test.ts` pins that: an envelope in `data`, singly and doubly wrapped, must not appear
in the output. If a data-side response is ever wanted again, it comes back as **one key where
data wins over the compiled value** — not as a blanket spread, which is what let a stale compile
shadow a fresh one.

### What `app.ts` serves, and why the order and the headers are load-bearing

Four rules, three of which are shipped bug fixes, and all four now pinned by `app.test.ts`.
Changing any of them looks harmless locally, where there is no CDN and no cross-origin host.

- **Public static is mounted BEFORE auth.** `lexicon.json`, `schema.json`, `spec.html`,
  `instructions.md`, `language-info.json`, `usage-guide.md`, `scope.json` and `template.gc` must
  be fetchable with no token — an agent reads them before it has one. `index: false` keeps
  `GET /` a health check rather than the embed's `index.html`. Note that `routes.auth` is not a
  gate: it attaches `req.auth` and **does not reject an anonymous request**, so mounting after
  it protects nothing by itself.
- **`/assets/*` is immutable, `/form` must never be held.** The bundle's filenames carry a
  content hash, so a new build is a new name and those may be cached forever. The embed HTML
  _names_ that bundle, so caching it caches the whole deploy: new assets sit there unreferenced
  while every visitor keeps running the previous build — a failure that looks exactly like a
  successful deploy. `no-cache` alone was not enough behind Cloudflare, which served a HIT with
  `age: 1191` and rewrote the header, so `/form` goes out with `Cache-Control`,
  `CDN-Cache-Control` **and** `Cloudflare-CDN-Cache-Control` all `no-store`.
- **`Cross-Origin-Resource-Policy: cross-origin` on every response.** Without it a COEP-isolated
  host — the claude.ai and chatgpt.com widget iframes — blocks the `/form` frame outright.
- **`GET /lexicon.js` is aliased to `lexicon.json`** for the still-deployed console, which
  slices from the first `{` and parses. No `lexicon.js` is emitted; drop the alias once the
  console migrates (Stage 3).

## The view is a renderer, not a player

`components/survey/Survey.tsx` is the whole of it, and it is **read-only by design rather than
by stage**. Adding a control would create a third way to answer that neither of the two real
clients — the console editor and `update_item` — shares.

It shows the initial state and the current one **side by side**: left is the set as code
generation inlined it, right is what came back. Ideas carried into `selection` are dimmed on the
left rather than removed, so the column keeps its shape and what was passed over stays visible.
The columns stack on a narrow viewport, because this is published as an embed and renders inside
other people's pages. A survey with no `response` shows the right column explicitly empty and
captioned — that is the state code generation leaves an item in, and it must read as awaiting a
response rather than as broken.

`Survey` is exported as `Form` too, because that is the prop name the shared View takes. **No
`reduce` is passed** — L0182 has no actions of its own, so the `LanguageReducer` hook is unused
here and L0179 is again its only user.

**There is no DOM in the view suite, deliberately.** `vitest.config.ts` pulls in no jsdom, which
is what keeps a published component's dev tree free of a rendering library. So the logic that
can be wrong without looking wrong lives in `lib/survey.ts` as pure functions —
`resolveSelection` and `boundsLabel` — and `lib/survey.test.ts` is what tests it. Do not reach
for a render test; put the logic in `lib/` and keep the component a projection of it.
`embed/dev.html` is the way to _look_ at it: it renders every state against fixed models with no
API behind them, and Vite builds only `index.html`, so it never reaches the embed bundle.

**`resolveSelection` names an unresolvable id rather than dropping it.** The compiler refuses
those, so they only arrive on a record assembled outside it — but silently dropping one would
render a shorter ranking than the one actually recorded, which is the kind of wrong that looks
right.

### Preflight is off, and four rules have to come back

`tailwind.config.js` disables preflight so this published component never injects a global reset
into a consumer app or the page hosting the `/form` iframe. But preflight is also what sets
`border-style: solid; border-width: 0` — without it every `border-*` utility renders no border
at all — plus `box-sizing`, the list reset and the `button` reset. `src/index.css` restores them,
scoped to `.l0182-survey`, **every selector wrapped in `:where()`**: that contributes zero
specificity, so the reset sits under the utilities it is resetting for. Written without it,
`.l0182-survey button` scores (0,1,1) and beats `.bg-green-700` — which shipped once, rendering
every filled control as plain text. The component's root carries that class; a new tree that
wants borders must sit inside it.

## Spec is tested, not decorative

`docs.test.ts` is the gate on `spec/`. A wrong example is not a documentation nit — the
generator writes from `instructions.md` and retrieves from `examples.md`, so it is reproduced
verbatim into generated programs.

- Every fenced program in `spec.md` and `instructions.md`, plus `template.gc`, **compiles** —
  not merely parses. Programs are recognized by the `..` terminator rather than a list of
  opening words, because a list goes stale the moment the vocabulary changes.
- Every documented word exists in the lexicon with the signature claimed, and every L0182 word
  (derived as `lexicon` minus L0000's) is documented. The Functions table is **generated** from
  the lexicon — regenerate it rather than hand-editing.
- `schema.json` is validated against **real compiled output**, including a case asserting that
  `additionalProperties: false` actually bites. Draft 2020-12, so the test imports
  `ajv/dist/2020.js`; the hoisted ajv 6 cannot read it.
- The `## Which words each container takes` table must equal `validAttributes` exactly.
- `examples.md` numbering is coherent: prompts run `1..N`, category ranges tile the list, and
  the stated count is the count present.
- **`scope.json` carries the keywords the MCP router extracts.** `limitSentences()` in
  `graffiticode-mcp-server` inlines only sentences matching
  `/\b(ONLY when|do NOT|does NOT|are not built|not built yet|EARLY|never)\b/i` into the server
  instructions. A negative clause without one of those words never reaches the router — and
  L0180 absorbs survey requests, exactly as it over-captured cloze requests 3/3 before this was
  tuned. The test asserts several `out_of_scope` sentences carry one, and that L0180 is named.

Prose is still prose. Nothing can check that an `in_scope` line describes a capability
accurately, so re-read `scope.json` whenever the language changes.

`spec/usage-guide.md`'s `## Overview` is extracted into `dist/static/language-info.json` as
`authoring_guide`, and the build **fails** if it is missing or under 100 chars. Edit the
Overview, not the JSON.

**Two of the served assets are not the file you edited.** `build-static.js` concatenates
L0000's `instructions.md` with L0182's, and `lexicon.json` is the merged base + L0182 lexicon,
so `static/instructions.md` legitimately holds prose that appears in no file in this repo —
editing `spec/instructions.md` changes only the tail. Diff `spec/` against `static/` with that
in mind.

## Adding a word

1. Add its row to `attributeFields`. Arity 1; there is no other option.
2. Add it to the container's list in `validAttributes`.
3. Handle it in `buildSurvey` or `buildResponse` in `survey.ts`, with its default and its error
   messages — each naming the fix.
4. If the renderer needs it, add it to the model types in `packages/view/src/lib/survey.ts` and
   project it there, not in the component.
5. Extend `spec/schema.json`.
6. Document it in `spec/instructions.md` (the container table **and** the generated Functions
   table) and in `spec/spec.md`, each with a compiling example.
7. Add prompts to `examples.md`, updating the category range and the stated count.
8. Revisit `spec/language-info.json` and `spec/scope.json`.

## What was deleted, and why it is not coming back here

The repo carried all of this until the flow left the language. It is recorded because the
obvious next feature request re-proposes one of them:

- **A survey proxy** (`/survey/open|answer|results`) that the form and the MCP tools both called,
  so a participation was identical whichever client it arrived on. There is one client now — code
  — so there is nothing to converge, and `parity.test.ts` had nothing left to assert.
- **An in-memory mock backend** with a 20-idea seed pool, least-shown-first sampling over a
  rotating window, and per-actor-class tallies. It was the only reason for `--max-instances=1`.
- **An adaptive sampler**, `sample N`, and the whole "the ideas are not authored, they live in
  the pool" model. The ideas are authored now — by code generation, not by hand.
- **A five-screen React player** (`start`/`select`/`rank`/`contribute`/`results`/`thanks`), its
  `KINDS` registry, drag-and-drop ranking, and the `navigate`/`response` action split.
- **`participants` and `audience`**, the human-vs-agent gate and the per-population ranking.
  Both clients are the same client now, so there is no population to separate.
- **`scripts/post-response.mjs`**, which posted a response as task data. Responses are code.

If a live pool, cross-participant aggregation or an interactive flow is wanted, it is a service
plus a different client — not a return of these.

## Back-port surface (for L0180)

**There isn't one any more.** `items`, `navigation`, `submission` and `activity.ts` are deleted
here. L0180 already holds its copy of them on branch `activity-level` and is unaffected; the two
languages have diverged and no longer share a shape. Sections and item banks — QTI's `selection`
and `ordering` over an authored bank — remain L0180's business, and were always the wrong
construct here.

`title` is arity 1 again, which also removes the one correction that contract carried: it could
not be back-ported at arity 2 because L0180 already had `title` at arity 1 inside `stimulus`.

## Not built yet

Aggregating across responses — a group ranking, a tally, or any live result. Drawing the sample
(that is the L0170 fetch at code generation, outside this repo). An interactive survey-taking
flow. Conventional questionnaire items — Likert, demographics, satisfaction ratings, branching
logic. Ranking objects other than a line of text. Any analysis of the responses collected.
Enforced one-response-per-person.

## Related repos

- `l0000` — the base language and the View harness. Both are npm dependencies, not workspaces.
- `l0170` — the fetch-and-transform dialect that resolves a survey name into its idea set at code
  generation. The generic service-caller; L0182 consumes its output as inlined `ideas`.
- `console/docs/language-authoring-style.md` — the style spec this dialect follows.
- `console/src/lib/languages.ts` — the catalog. **L0182 must be registered here to reach any
  user.** Its `routingHint` still describes the adaptive sample, the shared pool and
  humans-and-agents-into-one-pool: all false now, and it must be rewritten keeping its `do NOT`
  and `never` clauses or L0180 starts absorbing survey requests.
- `graffiticode-mcp-server` — its `open_survey` / `answer_survey` tools target the deleted proxy.
  The agent path is now plain `create_item` / `update_item`, which is exactly the path a person
  uses.
- `l0180` — the assessment dialect this was originally copied from.
