# L0182

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](packages/LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE-DOCS)

L0182 is a Graffiticode dialect for **taking surveys**: a program names a survey the language
server holds and records one response to it. It inherits the base vocabulary of
[@graffiticode/l0000](https://www.npmjs.com/package/@graffiticode/l0000).

A program names the survey being taken and, once something has answered, carries the response
to it: the options chosen in priority order, plus at most one write-in that was not in the set.

```
survey [
  id "team-retro"
  session-id get-val-public "itemId"
  response [
    choices ["cut the build time in half" "write smaller pull requests"]
    write-in "give every service a named owner"
  ]
]..
```

## The survey is not authored

A program says `id "team-retro"` and nothing else about the survey. Its options, title,
instructions and bounds (`minChoices`/`maxChoices`) live in one JSON file per version in
`packages/core/data/`, which the compiler reads when the program compiles; no word in the
language writes any of them, so whoever takes a survey cannot edit it.

An id that names several versions (`civic-priorities-1` … `civic-priorities-12`) draws one without
replacement; naming a version outright (`id "civic-priorities-7"`) takes exactly that one.
`session-id get-val-public "itemId"` keeps the draw stable across the turn that adds the response,
so the answer is checked against the options its taker actually saw.

An option is named in `choices` by its exact text, by its id, or by its position counting from 0.
Text is the one to use when writing a response, because whoever writes it has not seen the ids or
positions; all three resolve to ids in the compiled record.

## The code is the interface

There is no survey flow here: no screens, no steps, no navigation or submission, and nothing
that walks anyone through anything. A person writes the response in the console's editor; an AI
agent writes it through `update_item`. They are the same client, so both produce the identical
record, and the view only renders it — the set as it was given on one side, what came back on
the other.

If an interactive survey flow is wanted, that is a different language or a different client
reading this record.

## What L0182 does not do

It records one response. It does not draw the sample, aggregate across respondents, compute a
group ranking, or analyse anything.

It also has no notion of a right answer: a survey response is never scored. For graded questions
use [L0180](https://github.com/graffiticode/l0180).

## Development

```bash
npm install
npm run build   # core → static → api → view → embed → assemble
npm test        # core + api + view
npm run dev     # API on :50182
```

`npm run -w packages/view dev` runs the renderer alone on Vite; `/dev.html` there shows every
state of it — awaiting a response, answered, an option with nothing chosen, an unresolvable id —
against fixed models, with no API behind them.

## Packages

| Package         | Name                       | Role                                                       |
| --------------- | -------------------------- | ---------------------------------------------------------- |
| `packages/core` | `@graffiticode/l0182`      | The language: lexicon, compiler, spec                      |
| `packages/api`  | `@graffiticode/api-l0182`  | Language server: `/compile`, `/form`, public static assets |
| `packages/view` | `@graffiticode/l0182-view` | The renderer                                               |

## Environment

| Variable   | Default                         | Purpose                    |
| ---------- | ------------------------------- | -------------------------- |
| `PORT`     | `50182`                         | The language server's port |
| `AUTH_URL` | `https://auth.graffiticode.org` | Token verification         |

There is no service credential and no backend to configure. Everything a program needs is in
the program.

See [CLAUDE.md](CLAUDE.md) for the design record.
