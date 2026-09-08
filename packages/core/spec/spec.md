<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182

L0182 is a **survey record** for collective intelligence: a named set of ideas someone is asked
to choose between, and the response to it — the ideas chosen, in priority order, plus one new
idea that was not in the set.

An L0182 program is one survey and at most one response to it.

## Structure

```
survey [ name "you-can-choose" ideas ["clean air and water" "affordable housing"] ]..
```

The ideas are **not authored by hand**. They are written into the program at code generation:
the survey's `name` is resolved against the service that holds the pool — through an L0170
`fetch` — and the set that comes back is inlined here. What you edit afterwards is the response.

There is no flow in this language. It does not describe screens, steps, navigation or
submission, and nothing in it takes a participant through anything. The code is the interface:
a person writes it in the console's editor, an agent writes it through `update_item`, and both
produce the same record.

## The ideas

Each entry is a line of text, or a record naming the id the service knows it by.

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas [
    {id: "a3" text: "protect voting rights"}
    {id: "b7" text: "universal healthcare system"}
    {id: "c1" text: "affordable housing"}
  ]
]..
```

An entry that names its own id keeps it; one that does not is numbered by position, `i0`
upward. Keep the service's ids when the fetch returned them — a selection of positional ids
means nothing back at the service the set came from.

A set needs at least two ideas, and no two may repeat the same text or share an id.

## Selection bounds

```
survey [
  name "priorities"
  ideas ["clean air and water" "affordable housing" "invest in public transit"]
  min-choices 1
  max-choices 2
]..
```

`min-choices` defaults to 0 and `max-choices` to the number of ideas. `max-choices` can never
exceed the size of the set, and `min-choices` can never exceed `max-choices`. Because there is
no player, these bounds are enforced only here: the compiler is what refuses a response that
breaks them.

## The response

```
survey [
  name "you-can-choose"
  ideas [
    "protect voting rights"
    "universal healthcare system"
    "affordable housing"
  ]
  max-choices 2
  response [
    selection [2 0]
    idea "ranked-choice voting"
  ]
]..
```

`selection` names the ideas chosen, never their text, and **the order is the ranking** — first is
most important. No idea may appear twice.

An idea may be named **by its id in quotes** — `selection ["b7" "a3"]` — or **by its position,
counting from 0** — `selection [2 0]` is the third idea then the first. Both work for any set. A
number is always a position and a string is always an id, so the two cannot be confused even when
a set's ids look like numbers: `selection [1]` is the second idea, `selection ["1"]` is the idea
whose id is `1`. Either way the compiled record carries ids, so the two forms differ only in the
source.

`idea` is one new idea, contributed by whoever answered. It must not repeat an idea already in
the set; that is what makes it new. It may stand alone, with nothing selected.

`response` is written inside the survey's brackets and lifted to the top level of the compiled
record. A survey with no `response` is the state code generation leaves it in.

## Compiled output

```json
{
  "survey": {
    "name": "you-can-choose",
    "title": "You Can Choose",
    "ideas": [
      { "id": "i0", "text": "protect voting rights" },
      { "id": "i1", "text": "universal healthcare system" },
      { "id": "i2", "text": "affordable housing" }
    ],
    "minChoices": 0,
    "maxChoices": 2
  },
  "response": { "selection": ["i2", "i0"], "idea": "ranked-choice voting" }
}
```

The renderer shows these side by side: the set as it was given on the left, and what came back
— the selection in priority order, and the new idea — on the right.
