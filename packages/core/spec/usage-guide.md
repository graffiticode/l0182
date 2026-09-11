<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Using L0182

## Overview

L0182 is a survey record for collective intelligence. A program names the survey being taken and
— once something has answered — carries the response to it: the ideas chosen in priority order,
plus one new idea that was not in the set. The survey itself is NOT written in the program. Its
ideas, its title, its instructions and its bounds come from the back end, which the compiler
reads when the program compiles, so whoever takes a survey has not seen it beforehand and cannot
edit it. A survey may hold several versions, and taking it draws one of them at random; the
version drawn is recorded in the compiled record. L0182 describes no flow at all: no screens, no
steps, no navigation, no submission, and nothing that aggregates across respondents. The code is
the interface — a person edits the program in the console's editor, an agent edits it through
`update_item`, and both produce the identical record, which the renderer shows as the set on one
side and the response on the other.

## Getting started

The smallest program is the survey's id and the session taking it:

```
survey [ id "you-can-choose" session-id get-val-public "itemId" ]..
```

That is a survey awaiting a response. `id` says which survey this is, and the compiled record
comes back with its ideas, its title, its instructions and its bounds.

Write `session-id get-val-public "itemId"` verbatim in every program. It names one taking of the
survey, and it is what brings the same version back on the turn that answers.

## The surveys you can take

| `id`               | The survey                                               |
| :----------------- | :------------------------------------------------------- |
| `you-can-choose`   | civic priorities — twelve versions, one drawn per taking |
| `team-retro`       | eight engineering-team retro ideas                       |
| `city-budget`      | ten neighbourhood projects a council could fund          |
| `product-features` | nine features customers have asked for                   |
| `school`           | seven school improvements                                |

An id that does not exist is a compile error listing the ones that do. A survey's versions are
numbered — `you-can-choose-1`, `you-can-choose-2`, … — and naming one takes it outright, with no
draw.

## Answering

```
survey [
  id "team-retro"
  session-id get-val-public "itemId"
  response [
    selection ["cut the build time in half" "fix the flaky tests before adding features"]
    idea "give every service a named owner"
  ]
]..
```

`selection` names the ideas chosen and **the order is the ranking** — first is most important.
Name each idea by its **exact text**: the ideas live in the survey, so the ids are not something
you can know when you write the response, and a guessed position compiles cleanly while
recording the wrong idea. An id or a position counting from 0 is accepted only when the compiled
survey is in front of you. `idea` is one new idea that must not already be in the set; that is
what makes it new, and it may stand alone with nothing selected.

Keep `session-id` when you add the response. Without it the survey may be drawn again, and the
answer checked against a version its taker never saw.

## Bounds, and why they matter here

`minChoices` and `maxChoices` belong to the survey, not to the program. They default to 1 and 5 —
or to one fewer than the set when the set is smaller, so a default never lets a response name
every idea there is. Choosing everything is not choosing.

Nothing enforces these at delivery, because there is no delivery. The compiler is the only check
there is, which is why it refuses a response that breaks them rather than clamping it.

## What you do not write

The survey. There is no word for a set of ideas, a title, an instruction line or a bound, and
writing one is a compile error rather than an override — the survey is the back end's, and a
survey its taker could edit would not be one.

A flow, either. L0182 has no item list, no ordering, no navigation or submission modes, and no
results screen — it does not aggregate anything across respondents. If a survey-taking flow is
wanted, that is a different language or a different client reading this record.
