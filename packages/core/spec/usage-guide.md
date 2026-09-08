<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Using L0182

## Overview

L0182 is a survey record for collective intelligence. A program is a named set of ideas someone
is asked to choose between, and — once something has answered — the response to it: the ideas
chosen in priority order, plus one new idea that was not in the set. The ideas are given rather than
invented: either `ideas fetch "<url>"` reads them from the dataset that holds them — JSON, or CSV
keyed by its header row — when the program compiles, or they are written out in full when they
are already in hand. Either way the set is fixed once the program has compiled. L0182 describes
no flow at all: no screens, no steps, no navigation, no submission, and nothing that draws a
sample or aggregates across respondents. The code is the interface — a person edits the program
in the console's editor, an agent edits it through `update_item`, and both produce the identical
record, which the renderer shows as the set on one side and the response on the other.

## Getting started

The smallest survey is a name and somewhere to read the ideas from:

```
survey [ name "priorities" ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json" ]..
```

That is a survey awaiting a response. `name` says which survey this is and ties any later
response back to it; `fetch` reads the set.

## Where the set comes from

`fetch` reads JSON or CSV. A CSV's header row names the fields, so `id,text` and the equivalent
JSON give the same set; unused columns are ignored, and an id that looks like a number stays a
string. The address must be public — no credentials are sent — and cannot point inside the
network the language server runs in.

It reads the dataset once, when the program first compiles, and the set is fixed from then on.
That is deliberate: a response only means anything against the ideas it was shown.

L0182 serves a sample set of twelve civic priorities in both formats, so the example above is
one you can run: `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json` and `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv`.

## Writing the set out instead

For ideas already in hand, write them literally. Each entry is a line of text, or a record naming
the id the service knows it by — keep those ids whenever the dataset carried them.

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas [
    {id: "a3" text: "protect voting rights"}
    {id: "b7" text: "affordable housing"}
    {id: "c1" text: "mitigate climate change"}
  ]
]..
```

An entry with no id is numbered by position, `i0` upward. A set needs at least two ideas, no two
may repeat the same text, and no two may share an id.

## Answering

```
survey [
  name "priorities"
  ideas ["clean air and water" "affordable housing" "invest in public transit"]
  min-choices 1
  max-choices 2
  response [
    selection [1 0]
    idea "make public transit free at the point of use"
  ]
]..
```

`selection` names the ideas chosen and **the order is the ranking** — first is most important.
An idea may be named by its **id in quotes** or by its **position, counting from 0** — a number
is always a position, a string always an id, so the two never collide. Positions read best for a
set of plain strings like this one, whose ids the language numbered itself. `idea` is one new
idea that must not already be in the set; that is what makes it new, and it may stand alone with
nothing selected.

## Bounds, and why they matter here

`min-choices` defaults to 0 and `max-choices` to the number of ideas. `max-choices` can never
exceed the size of the set, and a `selection` is checked against both.

Nothing enforces these at delivery, because there is no delivery. The compiler is the only check
there is, which is why it refuses a response that breaks them rather than clamping it.

## What you do not write

A flow. L0182 has no item list, no ordering, no navigation or submission modes, and no results
screen — it does not hold a pool, draw a sample, or aggregate anything across respondents. If a
survey-taking flow is wanted, that is a different language or a different client reading this
record.
