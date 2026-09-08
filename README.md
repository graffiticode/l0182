# L0182

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](packages/LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE-DOCS)

L0182 is a Graffiticode dialect for **collective-intelligence surveys** — group ideation where
people both contribute ideas and choose between them. It inherits the base vocabulary of
[@graffiticode/l0000](https://www.npmjs.com/package/@graffiticode/l0000).

A program is a named set of ideas and, once something has answered, the response to it: the
ideas chosen in priority order, plus one new idea that was not in the set.

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas fetch "https://example.org/surveys/you-can-choose/ideas.json"
  max-choices 2
  response [
    selection [2 0]
    idea "ranked-choice voting"
  ]
]..
```

## The ideas are not authored

`fetch` reads them from the dataset that holds them — JSON, or CSV keyed by its header row — when
the program compiles. Compiled results are stored against a content-addressed task id, so a
program reads its dataset **once** and the set is fixed from then on: a response only means
anything against the ideas it was shown.

The address must be public; no credentials are sent, and one written into a URL would be stored
in the program. L0182 holds no pool, samples nothing, and never re-reads a set it has compiled.

An idea is named in a `selection` by its id, or by its position counting from 0.

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
state of it — awaiting a response, answered, an idea with nothing chosen, an unresolvable id —
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
