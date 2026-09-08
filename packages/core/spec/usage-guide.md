<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Using L0182

## Overview

L0182 is a survey record for collective intelligence. A program is a named set of ideas someone
is asked to choose between, and — once something has answered — the response to it: the ideas
chosen in priority order, plus one new idea that was not in the set. The ideas are never
authored by hand. They are resolved from the survey's `name` against the service that holds the
pool, through an L0170 `fetch`, and inlined into the program at code generation. L0182 describes
no flow at all: no screens, no steps, no navigation, no submission, and nothing that draws a
sample or aggregates across respondents. The code is the interface — a person edits the program
in the console's editor, an agent edits it through `update_item`, and both produce the identical
record, which the renderer shows as the set on one side and the response on the other.

## Getting started

The smallest survey is a name and a set to choose from:

```
survey [ name "priorities" ideas ["clean air and water" "affordable housing"] ]..
```

That is what code generation produces: a survey awaiting a response. `name` is the argument the
set was resolved from, and it is what ties any later response back to the survey it answers.

## The ideas

Each entry is a line of text, or a record naming the id the service knows it by. Keep the
service's ids whenever the fetch returned them — a selection of positional ids means nothing
back at the service.

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
    selection ["i1" "i0"]
    idea "make public transit free at the point of use"
  ]
]..
```

`selection` carries idea ids and **the order is the ranking** — first is most important. `idea`
is one new idea that must not already be in the set; that is what makes it new, and it may stand
alone with nothing selected.

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
