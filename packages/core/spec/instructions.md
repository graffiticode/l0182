# L0182 — collective-intelligence surveys

L0182 is a **survey record**: a named set of ideas someone is asked to choose between, and the
response to it — the ideas chosen in priority order, plus one new idea that was not in the set.

OUT_OF_SCOPE: assessment and quiz items — anything with a right answer, points, marking or a
rubric. L0182 gathers opinions and does NOT score anyone. Use L0180 for graded questions.
Conventional questionnaires (Likert scales, demographics, satisfaction ratings, branching form
logic) are not built yet. L0182 does NOT implement a survey-taking flow: it has no screens,
steps, navigation or submission, and it never draws a sample or aggregates across respondents.

## The shape of a program

One word, `survey`, applied to an attribute list.

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas [
    "protect voting rights"
    "universal healthcare system"
    "affordable housing"
  ]
  max-choices 2
]..
```

Every word in the language takes exactly one argument. Nothing chains, and nothing takes a
trailing record.

| Target shape                | How it is written                                                   |
| :-------------------------- | :------------------------------------------------------------------ |
| the survey, or the response | a word applied to an attribute list — `response [selection ["i0"]]` |
| a scalar                    | the value itself — `max-choices 5`, `title "…"`                     |
| a list                      | the list itself — `ideas ["…" "…"]`, `selection ["i2" "i0"]`        |

## The ideas are written at code generation

**Never invent the ideas.** They are resolved from the survey's `name` against the service that
holds the pool — through an L0170 `fetch` — and the set that comes back is inlined into the
program. An entry is a line of text, or a record naming the id the service knows it by:

```
survey [
  name "you-can-choose"
  ideas [
    {id: "a3" text: "protect voting rights"}
    {id: "b7" text: "affordable housing"}
  ]
]..
```

Keep the service's ids whenever the fetch returned them — a selection of positional ids means
nothing back at the service. An entry with no id is numbered by position, `i0` upward.

A set needs at least two ideas. No two may repeat the same text, and no two may share an id.

## The response

```
survey [
  name "priorities"
  ideas ["clean air and water" "affordable housing" "invest in public transit"]
  response [
    selection [2 0]
    idea "protect public lands from being sold off"
  ]
]..
```

- `selection` names the ideas chosen, never their text, and **the order is the ranking** — first
  is most important. No idea may appear twice.
- **When the set carries no ids of its own, name each idea by its position, counting from 0** —
  `selection [2 0]` is the third idea then the first. That is the form above, and the one to
  prefer for a set of plain strings: the language derives `i0`, `i1`, … for exactly those ideas,
  so writing `"i2"` is spelling out a number it already knows.
- **When the ideas carry their own ids, name the ids** — `selection ["b7" "a3"]`. Positions are
  refused there, because the id is what the service the set came from understands and a position
  could not be handed back to it.
- `idea` is one new idea from whoever answered. It must NOT repeat an idea already in the set —
  that is what makes it new. It may stand alone, with nothing selected.

`response` is written inside the survey's brackets and lifted to the top level of the compiled
record. A program with no `response` is a survey awaiting one, which is what code generation
produces.

## Which words each container takes

| Container  | Takes                                                  |
| :--------- | :----------------------------------------------------- |
| `survey`   | name, title, ideas, min-choices, max-choices, response |
| `response` | selection, idea                                        |

## Selection bounds

`min-choices` defaults to 0 and `max-choices` to the number of ideas. `max-choices` can never
exceed the size of the set, and `min-choices` can never exceed `max-choices`. A `selection` is
checked against both.

```
survey [ name "priorities" ideas ["one" "two" "three"] min-choices 1 max-choices 2 ]..
```

Nothing enforces these at delivery, because there is no delivery — the compiler is the only
check there is.

## There is no flow

L0182 does not describe screens, steps, ordering, navigation or submission. It does not draw a
sample, does not hold a pool, and does not aggregate anything across respondents. A program is
one set of ideas and at most one response to it.

The code IS the interface: a person edits the program in the console, an agent edits it through
`update_item`, and both produce the same record. The renderer shows the set as it was given
beside what came back.

## Functions

Every word L0182 adds to the base language. All are arity 1.

| Word          | Signature          | Arity | Meaning                                                                                                                                                                             |
| :------------ | :----------------- | :---: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `<string: record>` |   1   | The survey this set of ideas was drawn from. It is what ties a response back to the survey it answers, and it is the argument code generation resolves the idea set from.           |
| `title`       | `<string: record>` |   1   | The survey's title, shown above the ideas.                                                                                                                                          |
| `ideas`       | `<list: record>`   |   1   | The set of ideas this response is chosen from, written at code generation. Each entry is a line of text, or a record naming the service's own id: ideas ["…" {id: "a3" text: "…"}]. |
| `min-choices` | `<number: record>` |   1   | Fewest ideas a response may select. Defaults to 0.                                                                                                                                  |
| `max-choices` | `<number: record>` |   1   | Most ideas a response may select. Defaults to the number of ideas.                                                                                                                  |
| `selection`   | `<list: record>`   |   1   | The ideas chosen, in priority order — the order IS the ranking, first is most important. Each entry is an idea's id, or, when the set carries no ids of its own, its position counting from 0: selection [2 0]. |
| `idea`        | `<string: record>` |   1   | One new idea, contributed by whoever answered. It must not repeat an idea already in the set — that is what makes it new.                                                           |
| `survey`      | `<list: record>`   |   1   | A named set of ideas to choose from, and optionally the response to it.                                                                                                             |
| `response`    | `<list: record>`   |   1   | The ideas chosen, in priority order, and optionally one new idea that was not in the set.                                                                                           |

## A full example

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas [
    {id: "a3" text: "protect voting rights"}
    {id: "b7" text: "universal healthcare system"}
    {id: "c1" text: "protect public lands and waters from being sold off"}
    {id: "d9" text: "affordable housing"}
    {id: "e4" text: "remove profit from healthcare"}
    {id: "f2" text: "end Citizens United"}
    {id: "g8" text: "mitigate climate change"}
    {id: "h5" text: "clean air and water"}
    {id: "j7" text: "lower prescription drug prices"}
    {id: "k1" text: "strengthen public schools"}
  ]
  min-choices 1
  max-choices 5
  response [
    selection ["d9" "a3" "h5"]
    idea "make public transit free at the point of use"
  ]
]..
```
