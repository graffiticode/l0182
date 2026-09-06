# L0182

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](packages/LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE-DOCS)

L0182 is a Graffiticode dialect for **collective-intelligence surveys** — group ideation where
participants both contribute ideas and choose between them. It inherits the base vocabulary of
[@graffiticode/l0000](https://www.npmjs.com/package/@graffiticode/l0000) and adds survey
activity authoring on top.

```
items [
  select [
    prompt "Which of these should we focus on next?"
    sample 10
    max-choices 5
  ]
  rank []
  contribute [ optional ]
  results [ show-scores show-participants ]
] title "Team Priorities" session "abc123" {}..
```

A participant is shown an adaptive sample of ideas drawn from a shared pool, selects the ones
they prefer, ranks those selections, may add one idea of their own, and sees the group's live
ranking. Their micro-ranking joins everyone else's, and an aggregation engine predicts how the
whole pool would be ranked if everyone had seen all of it.

## An activity is a list of items

L0182 follows the shape the Graffiticode assessment languages already use and QTI's delivery
vocabulary: an activity is an ordered list of items, plus the settings that govern how a
participant moves through them.

| Item | What it does |
|------|--------------|
| `start` | Content only. Opens the activity behind a single control. |
| `select` | Shows a sample of ideas; the participant picks the ones they prefer. |
| `rank` | The participant orders the ideas they selected. |
| `contribute` | The participant adds one idea of their own to the pool. |
| `results` | Content only. The group's current ranking. |
| `thanks` | Content only. Closes the activity. |

Five settings chain after the items list: `title`, `session`, `participants`, `navigation`
(QTI's `navigationMode`) and `submission` (QTI's `submissionMode`).

## Two clients, one instrument

The same activity is taken by **people** through the rendered form and by **AI agents** through
MCP tools, into the same pool and through the same endpoints. Every participation is tagged with
the class it came from — assigned by the server from the route, never claimed by the caller — so
the two populations stay separable without being separated:

```
items [
  select [sample 10 max-choices 5]
  results [ audience "human" show-scores ]
] participants ["human" "agent"] {}..
```

## What L0182 does not do

It declares parameters. The idea pool, the adaptive sample and the ranking belong to the
collective-intelligence service named in `session`.

It also has no notion of a right answer: a survey response is never scored. For graded questions
use [L0180](https://github.com/graffiticode/l0180).

## Development

```bash
npm install
npm run build   # core → static → api → view → embed → assemble
npm test        # core + api + view
npm run dev     # API on :50182
```

`npm run -w packages/view dev` runs the player alone on Vite for fast renderer work.

## Packages

| Package | Name | Role |
|---------|------|------|
| `packages/core` | `@graffiticode/l0182` | The language: lexicon, compiler, spec |
| `packages/api` | `@graffiticode/api-l0182` | Language server: `/compile`, `/form`, the survey proxy |
| `packages/view` | `@graffiticode/l0182-view` | The survey player |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `50182` | The language server's port |
| `AUTH_URL` | `https://auth.graffiticode.org` | Token verification |
| `MYSTICWONK_API_URL` | — | The collective-intelligence service the proxy forwards to |
| `MYSTICWONK_API_KEY` | — | Its credential. Server-side only; never sent to a client |

See [CLAUDE.md](CLAUDE.md) for the design record.
