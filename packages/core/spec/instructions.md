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

## The ideas are given, never invented

They belong to the survey the program names, so there are exactly two ways to get them — and
**making them up is not one of them.**

**If they live at an address**, point `ideas` at it and `fetch` reads the dataset when the
program compiles:

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json"
]..
```

`fetch` reads **JSON or CSV**. Either way the dataset is a list of ideas, and an idea is a line
of text or a record carrying the id the service knows it by:

```json
[
  { "id": "a3", "text": "protect voting rights" },
  { "id": "b7", "text": "affordable housing" }
]
```

```
id,text
a3,protect voting rights
b7,"affordable housing, and enough of it"
```

A CSV's header row names the fields, so `id,text` gives the same set as the JSON above. Columns
the language has no use for are ignored. The address must be public — `fetch` sends no
credentials — and it may not point inside the network the language server runs in.

The fetch happens **once**, when the program first compiles, and the set is then fixed: a
response only means anything against the ideas it was shown.

**If they are already in hand** — the user pasted them, or an earlier step produced them —
write them out in full:

```
survey [
  name "you-can-choose"
  ideas [
    {id: "a3" text: "protect voting rights"}
    {id: "b7" text: "affordable housing"}
  ]
]..
```

Neither form is a fallback for the other: fetch when the ideas live somewhere, write them out
when you have them. Keep the service's ids whenever the dataset carried them. An entry with no
id is numbered by position, `i0` upward.

A set needs at least two ideas. No two may repeat the same text, and no two may share an id.

### A dataset to try

L0182 serves a sample set of twelve civic priorities, in both formats, for examples and for
getting started:

- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json`
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv`

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

- `selection` names the ideas chosen, and **the order is the ranking** — first is most important.
  No idea may appear twice.
- **When the ideas were fetched, name them by their exact text.** This is the important rule.
  `ideas fetch "<url>"` means the set does not exist until the program compiles, so you have not
  seen the ids or the positions and cannot know them. Guessing a position compiles cleanly and
  records the WRONG ideas:

```
survey [
  name "priorities"
  ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json"
  max-choices 3
  response [ selection ["affordable housing" "clean air and water"] ]
]..
```

- **When you can see the set** — you wrote it out, or you read it back after compiling — name an
  idea by **its id** (`selection ["b7" "a3"]`) or **its position, counting from 0**
  (`selection [2 0]` is the third idea then the first).
- Text matching ignores case and surrounding space, but the words must be the idea's own.
- A number is always a position and a string is never one, so those cannot be confused even for a
  set whose ids look like numbers: `selection [1]` is the second idea, `selection ["1"]` is the
  idea whose id is `1`. Between the two string forms an id wins.
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

`min-choices` defaults to 1 and `max-choices` to 5 — or to one fewer than the set when the set is
smaller, so a default never lets a response name every idea there is. Choosing everything is not
choosing. An authored `max-choices` may take the whole set; only a ceiling larger than the set is
refused, and `min-choices` can never exceed `max-choices`.

A `selection` is checked against both.

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

| Word          | Signature          | Arity | Meaning                                                                                                                                                                                            |
| :------------ | :----------------- | :---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `<string: record>` |   1   | The survey this set of ideas was drawn from. It is what ties a response back to the survey it answers, and it is the argument code generation resolves the idea set from.                          |
| `title`       | `<string: record>` |   1   | The survey's title, shown above the ideas.                                                                                                                                                         |
| `ideas`       | `<list: record>`   |   1   | The set of ideas this response is chosen from, written at code generation. Each entry is a line of text, or a record naming the service's own id: ideas ["…" {id: "a3" text: "…"}].                |
| `min-choices` | `<number: record>` |   1   | Fewest ideas a response may select. Defaults to 1.                                                                                                                                                 |
| `max-choices` | `<number: record>` |   1   | Most ideas a response may select. Defaults to the number of ideas.                                                                                                                                 |
| `selection`   | `<list: record>`   |   1   | The ideas chosen, in priority order — the order IS the ranking, first is most important. Each entry is an idea's id in quotes, or its position as a whole number counting from 0: selection [2 0]. |
| `idea`        | `<string: record>` |   1   | One new idea, contributed by whoever answered. It must not repeat an idea already in the set — that is what makes it new.                                                                          |
| `survey`      | `<list: record>`   |   1   | A named set of ideas to choose from, and optionally the response to it.                                                                                                                            |
| `response`    | `<list: record>`   |   1   | The ideas chosen, in priority order, and optionally one new idea that was not in the set.                                                                                                          |
| `fetch`       | `<string: any>`    |   1   | Reads a dataset over HTTP at compile time and evaluates to it: JSON, or CSV as a list of records keyed by its header row. This is how `ideas` gets its set.                                        |

## A full example

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json"
  min-choices 1
  max-choices 5
  response [
    selection [2 0]
    idea "make public transit free at the point of use"
  ]
]..
```
