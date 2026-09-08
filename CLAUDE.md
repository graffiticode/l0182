# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## What this is

L0182 is a Graffiticode dialect for **collective-intelligence surveys**. A participant is shown
a sample of ideas drawn from a shared pool, selects the ones they prefer, ranks those
selections, may contribute one idea of their own, and sees the group's live ranking. A
Markov/MCMC engine stitches those micro-rankings into a global one.

It exists to make the survey *instrument* an authored, versioned, forkable artifact rather than
a hard-coded app screen — and, having done that, to drive **two clients from one instrument**:
people through the rendered form, AI agents through MCP tools, into the same pool.

Two commitments the rest of the design follows from:

- **L0182 declares parameters; it does not own the pool.** Which ideas exist, which ten this
  participant is shown, and how the ranking is computed all belong to the
  collective-intelligence service named in `session`. Anything that would move the sampler or
  the aggregation engine into this repo is the wrong direction.
- **An activity is a list of items** — L0176's shape, QTI's delivery vocabulary. This layer is
  deliberately survey-agnostic so L0180 can take it (see "Back-port surface").

## Commands

```bash
npm run build      # core → build-static → api → view → view:embed → assemble
npm run dev        # API on :50182 (expects Firestore emulator :8080, local auth :4100)
npm run start      # the built API server
npm test           # core + api + view suites
npm run lint       # ESLint over the monorepo
npm run format     # Prettier over the monorepo (printWidth 100, double quotes)
npm run gcp:deploy # Cloud Run as l0182, us-central1 — but read "Deploying" first

npm run -w packages/view dev   # the /form embed app on Vite alone, no API, no auth
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
npm run -w packages/core test -- src/items.test.ts
npm run -w packages/core test -- src/items.test.ts -t "sample"
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `50182` | The language server's port |
| `AUTH_URL` | `https://auth.graffiticode.org` | Token verification |
| `MYSTICWONK_API_URL` | — | The collective-intelligence service the proxy forwards to. **Unset → the built-in mock** |
| `MYSTICWONK_API_KEY` | — | Its credential. Server-side only; never sent to a client |

### Deploying

Two rules hold the deployed service together. All three Cloud Build configs now carry both —
`cloudbuild.yaml` (what `npm run gcp:build` submits), plus `cloudbuild.production.yaml` and
`cloudbuild.staging.yaml` (the GitHub triggers described in `GITHUB_DEPLOYMENT.md`). **A new
deploy path has to carry them too:**

- **`--update-env-vars`, never `--set-env-vars`.** `set` replaces the whole environment, so a
  `MYSTICWONK_API_URL` added out of band is silently deleted by the next deploy — putting a
  configured deployment back onto mock data, which is exactly the failure the mock's warning
  exists to make visible.
- **`--max-instances=1`**, because the mock holds its pool and its participations in memory and
  a second instance has its own. Sibling languages run at 20. **Remove the pin once
  `MYSTICWONK_API_URL` is set** and the real service owns the state.

`npm run gcp:deploy` builds from source and passes neither flag. On an existing service Cloud
Run carries the current scaling and environment forward, so it is safe for a code-only push and
cannot be used to change either.

**Both trigger configs originally obeyed neither rule**, and production deploys the same
`l0182` service: `--set-env-vars=AUTH_URL,NODE_ENV=production` with
`--max-instances=$_MAX_INSTANCES` (default 100), so one push to `main` would have wiped
`MYSTICWONK_*` and unpinned the mock in a single build. Both were corrected to match, and
production's `_MAX_INSTANCES` substitution was **removed rather than defaulted to 1** — a value
that must be 1 should not be a knob a trigger can raise. Restore it, in all three files, when
the pin comes out.

## Architecture

Three workspaces on the published `@graffiticode/l0000` and `@graffiticode/l0000-view`.

- **`packages/core`** (`@graffiticode/l0182`) — the language. `attributes.ts` is the vocabulary
  as data; `lexicon.ts` and `compiler.ts` both generate from it; `spec/` is what agents read.
- **`packages/api`** (`@graffiticode/api-l0182`, private) — Express: `POST /compile`,
  `GET /form`, a health check at `/`, the assembled static assets, **and the survey proxy**.
  Its middleware order and cache headers are load-bearing — see "What `app.ts` serves".
- **`packages/view`** (`@graffiticode/l0182-view`) — the survey player.

### Two attribute tables, because there are two levels

`attributes.ts` holds one row per word, and the lexicon entry, the Checker method and the
Transformer method are all generated from it — arity included, so a word can never be declared
with one arity and handled with another. **Never hand-write an attribute handler.**

- `attributeFields` — arity 1, or 0 for a flag. Describes ONE item, inside its attribute list.
  The default; reach for this.
- `configFields` — **arity 2, chaining.** Configures the whole activity, sitting outside any
  attribute list, between the items member list and its closing record.

Only the containers (`ITEMS` and the six item kinds) and `PROG` are written out.

The style is attribute lists, per `console/docs/language-authoring-style.md` — the canonical
spec for authoring a Graffiticode dialect. Read it before adding vocabulary.

### The five arity-2 words, and the trap they carry

`title`, `session`, `participants`, `navigation`, `submission` are the entire arity-2 set. Each
takes its value *and the rest of the chain*, returning the chain's record with its own key
added — L0166's shape — so the tail of `items [...] title "…" navigation "linear" {}` builds
the configuration record the member list takes as its second argument.

**A config word written inside an item, as the last word in the brackets, is a parse error the
compiler never sees**: `select [sample 10 title "T"]` dies with "Too few arguments for TITLE.
Expected 2." `assertKnownAttributes` has a hint for exactly this case — "`title` configures the
whole activity, so it goes after the items list" — and it fires only when the word is *not*
last, because then the arity is satisfied and the value reaches the Transformer.

This is the known cost of the chained form. It is why the set is small, why
`spec/instructions.md` names all five in their own section, and why
`activity.test.ts` pins both behaviours rather than only the one with the good message. If the
set ever needs to grow much, reconsider the shape before adding to it.

### Value validation goes in the Transformer, never the Checker

`Checker.LIST` (inherited from L0000) visits only `elts[0]`. A rule written as a Checker method
therefore fires on the first element of a list and nowhere else — in a style built on lists,
almost nowhere. L0166 shipped a Checker rule rejecting negative points that silently did nothing
for exactly this reason. The generated Checker methods here walk the tree and do not judge.

Note the Checker still needs `checkBoth` for every arity-2 word: `elts[1]` is the rest of the
chain, and a method walking only `elts[0]` silently drops every error below it.

### Error messages are a product surface

The generator is an LLM that reads a compile error and tries again, so the wording is not a
diagnostic. Every message names the fix:

> select: `max-choices` (9) is more than `sample` (4), so the participant is never shown enough
> ideas to pick that many. Raise `sample` or lower `max-choices`.

The tests assert on that text, not merely that compilation failed. A message that stops naming
the fix is a regression even when the program still errors.

### Three words break the arity-1 rule, deliberately

`optional`, `show-scores` and `show-participants` are **arity 0**. `contribute [optional prompt
"…"]` folds to `[{optional: true}, {prompt: "…"}]` and merges; at arity 1 `optional` would
swallow `{prompt: "…"}` as its argument and silently lose the prompt.

And `items` is arity 2 — a member list: homogeneous children plus the container's own
configuration record, written `{}` when empty.

### activity → items, and why there are no sections

`activity.ts` is the layer: it resolves the configuration, numbers the items, and knows nothing
about surveys. `items.ts` holds the six kinds and every rule specific to them. That split is
what makes the activity layer a clean copy for L0180.

A **section** exists to carry a rule over a *group* of items — QTI's `selection` (draw 10 of 200
authored items), an `ordering`, a shared `rubricBlock`. A survey activity has no such group: its
six items each have their own rules.

**The survey's `sample 10` is not QTI's `selection`, and conflating them is the mistake to
avoid.** QTI draws N *authored items* from a bank the author wrote. `select` draws N *ideas from
a live participant-contributed pool* at delivery. One is a section-level construct over
authored content; the other is data inside one item. Sections earn their keep in L0180, where
item-bank draw is real. They earn nothing here.

### The item cursor is model state, never derived

`PROG` recompiles on every response. L0180's own record invokes this twice as the reason
shuffling cannot be computed at compile time — "a random order would reshuffle under the
candidate on every recompile". A cursor has the same hazard, so it lives in `response.item`,
advanced by an action.

### Two actions, and the split is the whole player

- **`navigate`** — merges into `response` and does **not** recompile. This is L0182's
  `LanguageReducer` (`packages/view/src/reduce.ts`), the hook `View` already exposes and which
  L0179 was previously the only user of. Moving between items is not an answer, and a compile
  round trip per screen would be both slow and wrong.
- **`response`** — an actual answer. Recompiles, which is what persists it as an upstream L0000
  object and what makes it survive a reload.

That distinction *is* `submission "individual"`: one submit per **answered** item, which is what
the live survey does and what the MCP tool sequence does. Same instrument, same steps, whichever
client you arrive on.

`navigate` also carries the participation id, so a run resumes from one merge rather than two
action types.

### PROG spreads `data` first

`resume(e0, { ...data, ...val })` — the fresh compile wins. `data` carries the participant's
response, but after one round trip it also carries the *previous* compile's `activity`, because
the View merges each compile result back into the model, and letting that shadow the newly
compiled one would render a stale activity forever. L0179 spreads the other way on purpose (its
learner edits live inside the compiled structure); L0181 also spreads data last, which is right
for its deck and **wrong here**. A response is a separate key the compiler never emits.

**It also unwraps the `{data, errors}` envelope before spreading, and must.** What comes back
as `options.data` on a round trip is not the model that went in: compiled data is stored as the
envelope `compile.ts` returns, so spreading it raw buried the response as
`{data: {response}, errors: []}` — one level below where `Form.tsx` reads `state.data.response`.
The response was stored correctly and read by nothing, so a survey silently failed to resume,
which is the one guarantee `submission "individual"` exists to make. Storage has been observed
adding a second layer after the first round trip, so the unwrap loops. This is the third place
this envelope has drawn blood — `l0000-view` normalises it in `ne()`, and
`graffiticode-mcp-server` rejected every survey as "not a survey" for reading `.activity` off
it — so assume any `data` crossing a storage boundary is wrapped until proven otherwise.

### What `app.ts` serves, and why the order and the headers are load-bearing

Four rules, three of which are shipped bug fixes. Changing any of them looks harmless locally,
where there is no CDN and no cross-origin host.

- **Public static is mounted BEFORE auth.** `lexicon.json`, `schema.json`, `spec.html`,
  `instructions.md`, `language-info.json`, `usage-guide.md`, `scope.json` and `template.gc` must
  be fetchable with no token — an agent reads them before it has one. `index: false` keeps
  `GET /` a health check rather than the embed's `index.html`.
- **`/assets/*` is immutable, `/form` must never be held.** The bundle's filenames carry a
  content hash, so a new build is a new name and those may be cached forever. The embed HTML
  *names* that bundle, so caching it caches the whole deploy: new assets sit there unreferenced
  while every visitor keeps running the previous build — a failure that looks exactly like a
  successful deploy. `no-cache` alone was not enough behind Cloudflare, which served a HIT with
  `age: 1191` and rewrote the header, so `/form` goes out with `Cache-Control`,
  `CDN-Cache-Control` **and** `Cloudflare-CDN-Cache-Control` all `no-store`.
- **`Cross-Origin-Resource-Policy: cross-origin` on every response.** Without it a COEP-isolated
  host — the claude.ai and chatgpt.com widget iframes — blocks the `/form` frame outright.
- **`GET /lexicon.js` is aliased to `lexicon.json`** for the still-deployed console, which
  slices from the first `{` and parses. No `lexicon.js` is emitted; drop the alias once the
  console migrates (Stage 3).

## The survey proxy is where the two clients meet

`packages/api/src/survey.ts` and `routes/survey.ts`. `POST /survey/open`,
`POST /survey/answer`, `GET /survey/results`.

The rendered form and the MCP tools call the **same three endpoints**, so "agent vs human is
transparent" holds at the transport layer rather than by convention: one sampler, one pool, one
code path. This is also why responses do not go through the console: no console mutation accepts
a data payload — `startCodeGeneration` is the only write, is LLM-mediated, takes 60–110 s, and
is annotated `destructiveHint: true`. Routing participants through it would be racy besides.

The service credential (`MYSTICWONK_API_KEY`) lives here and never reaches a browser or an
agent. That is the reason the proxy exists rather than the clients calling the service directly.

**`parity.test.ts` is the acceptance test for that claim**, and it is the one most likely to be
broken by an innocent-looking change and then misread as noise. It drives a human and an agent
through the same proxy functions the routes call, against a recorded service, and asserts the
two runs differ in **exactly one field**. If it fails, the two paths diverged: converge them.
Relaxing the assertion deletes the only check on the property this language exists to have.

### The mock backend, and what it is honest about

With no `MYSTICWONK_API_URL`, `survey.ts` falls through to `mock-service.ts` — one file and one
branch, so removing it later is a two-line change. It exists because the flow was unusable
without credentials nobody had yet.

The fallback is for **absence, never misconfiguration**: a URL that is set but unreachable still
errors. And it is loud in three places — a startup warning, `mock: true` on every frame, and a
"Sample data" badge in the player — because the failure to design against is a real deploy that
merely *forgot* the variable and then served invented rankings that look exactly like real ones.

Two things it gets right that are easy to get wrong:

- **Sampling needs BOTH properties.** Least-shown-first spreads exposure, which is what lets a
  pool grow without every participant seeing all of it. But sorting by exposure with a random
  tie-break gives only that: the seed counts differ by tens, so a 0..1 jitter never reorders
  anything and every participant draws the identical set. So it takes a *window* of the
  least-shown and chooses at random within it. The window rotates as exposure accumulates.
- **Tallies are per actor class**, so `audience` genuinely filters. Without that, the one feature
  this language exists to demonstrate would be untested.

Scoring is selections over times-shown. The real engine is MCMC over the micro-rankings; this is
a tally and no amount of tidying makes it that. State is in-memory, so deploy
`--max-instances 1` while mocked — the pin lives in `cloudbuild.yaml`, see "Deploying".

### The clients pass the item sequence, because the proxy cannot see it

The proxy receives a session, a participation, an actor and an answer — never the compiled
activity. A backend that does not already know the session therefore cannot bound the cursor or
size the sample. Both clients hold the activity, so both send `items: [{id, type, sample?}]`; a
real service knows this from the session and ignores it.

The same gap is why a frame carries a **superset** — `ideas`, `selected` and `results` on every
frame, with each renderer taking its slice. Teaching the mock the item sequence twice over would
be the alternative.

`participants` is sent for the same reason and matters more: it is the authored gate, and the
Form originally omitted it, so a survey restricted to one class enforced that against agents and
admitted humans. Send it on both open and answer.

### `actor` is derived from the route, never self-asserted

`actorOf` reads `X-Graffiticode-Client` (and `X-Graffiticode-Client-Host`), not the request
body. A caller able to name its own class could enter a human-only session by claiming to be
human, and a later human-vs-agent comparison would be quietly wrong with nothing to reveal it.
`routes/survey.test.ts` asserts a class in the body is ignored.

`assertAccepted` is what makes the authored `participants` list mean anything, and it refuses
with 403 naming both sides.

### Identity is a participation token, and it is not one-vote-per-person

The MCP `ToolContext` carries a bearer token or a *mutable workspace handle* — never a person —
and ChatGPT-class hosts mint a fresh MCP session per tool call. Session state cannot carry a
participant across the four or five calls of one survey. So `open` returns a participation the
caller passes back on every subsequent call: stateless, resumable, and the same mechanism the
form holds in `response.participation`.

**This does not enforce uniqueness.** An agent can open a second participation as easily as a
human can open an incognito window. Enforced uniqueness needs authenticated callers or
per-invitation tokens, and neither exists — do not assume it does.

## The ideas are not authored

An activity never lists ideas. `sample 10` says *how many* to draw, not which. `rank` carries no
list either — it orders whatever the preceding `select` gathered, which is why the compiler
refuses a `rank` without one. Both components read their content off the *frame* the server
returned, not off the item.

## The view

`Form.tsx` owns navigation and the two actions; `items.tsx` is the registry. Adding a seventh
kind is one entry there plus a component — `Form` chooses nothing by name.

Each registry entry says how to render the body, what value the item starts from, what answer to
submit, whether the participant may move on, and what the forward control reads. Nav lives in
`Form` rather than in the components so every item's Back/Next behaves identically and the
Skip/Next flip is stated once.

**There is no DOM in the view suite, deliberately.** `vitest.config.ts` pulls in no jsdom, so
`kinds.test.ts` and `reduce.test.ts` test the registry's state machine and the reducer as pure
functions — which is what keeps a published component's dev tree free of jsdom and a rendering
library. Do not reach for a render test when adding a kind; put the logic in the registry entry,
where it can be tested, and keep the component a projection of it.

- **Every item is fully controlled**, including the textarea — and that is a deliberate
  divergence from L0180. Its text inputs draft locally and commit on blur because there
  `respond` writes to the model and every keystroke would recompile. Here the working `value` is
  local React state owned by `Form`, and only *advancing* sends a `response`, so the deferral
  bought nothing and cost the Skip/Next flip: the label stayed on "Skip" until the participant
  clicked away from the box. Copy L0180's pattern only where reporting is expensive.
- **`RankItem` offers drag *and* up/down buttons, and both are load-bearing.** HTML5 drag events
  do not fire on touch and there is no keyboard path through them, so for a survey taken by the
  general public on a phone the buttons are the accessible path, not a fallback.
- **`move` is a move, not a swap.** Dropping an entry below its old position shifts everything
  between them; an off-by-one silently mis-orders a ranking without throwing or looking wrong.
  It is pure and tested for that reason.
- **`SelectItem` evicts the oldest selection at the ceiling** rather than refusing the click, so
  the participant gets feedback instead of a dead control.

### Preflight is off, and two rules have to come back

`tailwind.config.js` disables preflight so this published component never injects a global reset
into a consumer app or the page hosting the `/form` iframe. But preflight is also what sets
`border-style: solid; border-width: 0` — without it every `border-*` utility renders no border
at all — and what resets `button`, without which a survey embedded in someone else's site shows
native chrome buttons mid-card. `src/index.css` restores both, scoped to `.l0182-survey`. The
Form's root carries that class; a new component tree that wants borders must sit inside it.

## Spec is tested, not decorative

`docs.test.ts` is the gate on `spec/`. A wrong example is not a documentation nit — the
generator writes from `instructions.md` and retrieves from `examples.md`, so it is reproduced
verbatim into generated programs.

- Every fenced program in `spec.md` and `instructions.md`, plus `template.gc`, **compiles** —
  not merely parses. Programs are recognized by the `..` terminator rather than a list of
  opening words, because a list goes stale the moment an item kind is added.
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
accurately, so re-read `scope.json` whenever the language gains one.

`spec/usage-guide.md`'s `## Overview` is extracted into `dist/static/language-info.json` as
`authoring_guide`, and the build **fails** if it is missing or under 100 chars. Edit the
Overview, not the JSON.

**Two of the served assets are not the file you edited.** `build-static.js` concatenates
L0000's `instructions.md` with L0182's, and `lexicon.json` is the merged base + L0182 lexicon,
so `static/instructions.md` legitimately holds prose that appears in no file in this repo —
editing `spec/instructions.md` changes only the tail. Diff `spec/` against `static/` with that
in mind.

## Adding an item kind

1. Add its words to `attributeFields`, its container to `lexicon.ts`, and the kind to
   `ITEM_KINDS`.
2. Add its allowed set to `validAttributes`.
3. Add a `buildItem` case in `items.ts`, with its defaults and its error messages.
4. Extend `validateSequence` if it constrains where it may sit.
5. Add a renderer and register it in `KINDS` in `packages/view/src/components/form/items.tsx`
   — not in `Form.tsx`, which chooses nothing by name. Test the registry entry in
   `kinds.test.ts`; there is no DOM to render into.
6. Extend `spec/schema.json`: a `$defs` entry **and** the `oneOf` in `activity.items`.
7. Document it in `spec/instructions.md` (the container table **and** the generated Functions
   table) and in `spec/spec.md`, each with a compiling example.
8. Add prompts to `examples.md` as a new numbered category, updating the range and the count.
9. Extend `supported_item_types` in `spec/language-info.json` and revisit `scope.json`.

## Back-port surface (for L0180)

The languages are deliberately independent — no shared module, no conformance test between them
— so **this section is the whole contract**. Keep it accurate.

**Done — L0180 has it** (branch `activity-level`). What moved:

- the words `items` (arity 2), and `navigation`, `submission` (arity 2, chaining)
- `NAVIGATION_MODES = ["linear","nonlinear"]`, `SUBMISSION_MODES = ["individual","simultaneous"]`
- the `ITEMS` member-list Transformer, and `activity.ts` entire
- the emitted shape `{ activity: { navigation, submission, items: [...] } }`

**`title` could not go, and that is the one correction to this contract.** It was listed here at
arity 2; L0180 already has `title` at arity 1 inside `stimulus`, and the lexicon gives a word
exactly one arity, so taking it would have broken every stimulus in its corpus. An activity
there has no name. Anything added to `configFields` here has to be checked against L0180's
existing vocabulary before it can be called portable.

Two things were deliberately NOT copied, and both are cases where the same word means something
different: L0180 defaults to `nonlinear`/`simultaneous`, because that is what its renderer
already does — every item on one screen, nothing submitted in between — and its activity cursor
is local React state rather than model state, because nothing there is persisted mid-activity.

In L0180 the members are its existing `item [ stimulus [...] parts [...] {} ]`, and they nested
without change. **Sections belong there, not here** — that is where QTI's `selection` and
`ordering` over an item bank have work to do.

The activity vocabulary was taken from QTI and Learnosity rather than invented for surveys
precisely so this copy stays clean. Do not add a survey-shaped word to `activity.ts`.

## Not built yet

Sections and item banks. Conventional questionnaire items — Likert, demographics, satisfaction
ratings, branching logic. Ranking objects other than a line of text. Any analysis of the
responses collected. Enforced one-response-per-person.

## Related repos

- `l0000` — the base language and the View harness. Both are npm dependencies, not workspaces.
- `console/docs/language-authoring-style.md` — the style spec this dialect follows.
- `console/src/lib/languages.ts` — the catalog. **L0182 must be registered here to reach any
  user**; L0160's absence from that file is why it is invisible today.
- `graffiticode-mcp-server` — the `open_survey` / `answer_survey` tools, the widget language
  map, and `describeItem`. Its privacy contract covers survey responses; read it before logging
  anything from a participation.
- `l0180` — the assessment dialect this was copied from, and the destination of the back-port.
