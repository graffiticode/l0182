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
  instructions "Below is a list of things people have said they'd like their representatives to
    focus on. Please click to select the issues that matter most to you."
  ideas [
    "protect voting rights"
    "universal healthcare system"
    "affordable housing"
  ]
  max-choices 2
]..
```

**Always write a `title` and an `instructions`.** A survey is read by a person who arrives at it
cold, with no idea who is asking or why, and a set of ideas with no heading and no explanation is
not usable by them — it is the single most common thing a generated survey gets wrong. `name` is
an internal handle and is never shown as a heading.

**Every compiled survey has instructions**, whether or not the program wrote any: the compiler
substitutes a generic line rather than emitting a survey a participant cannot read. That fallback
is a floor, not a target. It says nothing about the subject, the audience or who is asking, so a
survey that ships with it reads as though nobody thought about the reader — write real ones from
the request.

- `title` is the survey's own name, in the words a participant would recognise: `"You Can Choose"`.
- `instructions` say what this is and what to do, in your own sentences, as the person running the
  survey would put it. Write them **from the request**: whatever the ask tells you about who is
  being surveyed and what for is what belongs here.
- Do **not** restate the number that may be chosen. A bounds line — "Choose up to 5 of 12" — is
  derived from `min-choices` and `max-choices` and rendered directly beneath the instructions, so
  saying it again in prose only risks contradicting it when the bounds change.

Every word in the language takes exactly one argument. Nothing chains, and nothing takes a
trailing record.

| Target shape                | How it is written                                                   |
| :-------------------------- | :------------------------------------------------------------------ |
| the survey, or the response | a word applied to an attribute list — `response [selection ["i0"]]` |
| a scalar                    | the value itself — `max-choices 5`, `title "…"`, `instructions "…"` |
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

L0182 publishes several sample sets, for examples and for getting started. They differ on
purpose — records with ids, bare strings, an id column, a text-only CSV — because a set can
arrive in any of those shapes.

**A JSON dataset may carry the words a participant reads**, as an envelope around its ideas:

```json
{
  "title": "What Matters Most?",
  "instructions": "Below is a list of things people have said they'd like their representatives to focus on. Please click to select the issues that matter most to you.",
  "ideas": [{ "id": "a3", "text": "protect voting rights" }]
}
```

A set that arrives this way supplies `title` and `instructions` on its own, so a program naming
nothing but the address still renders a page a person can read. They are **defaults**: a `title`
or `instructions` written in the program wins, because whoever wrote the program is closer to the
audience than whoever published the dataset. A bare list — a plain JSON array, or any CSV — carries
no such words, and then writing them is on you.

Every JSON sample below is an envelope. The CSVs are bare lists, on purpose:

- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json` — twelve civic priorities, with ids
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json` — eight engineering-team retro ideas, with ids
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json` — ten city budget ideas, as plain strings
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json` — nine product feature requests, with ids
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json` — seven school improvements, text only
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv` — the same twelve civic priorities, as a bare CSV
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv` — the same eight retro ideas, as a bare CSV
- `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv` — the same seven school improvements, text-only CSV

## The response

```
survey [
  name "priorities"
  ideas ["clean air and water" "affordable housing" "invest in public transit"]
  response [
    selection ["invest in public transit" "clean air and water"]
    idea "protect public lands from being sold off"
  ]
]..
```

- `selection` names the ideas chosen, and **the order is the ranking** — first is most important.
  No idea may appear twice.
- **When the ideas were fetched, name them by their exact text.** This is the important rule.
  `ideas fetch "<url>"` means the set does not exist until the program compiles, so you have not
  seen the ids or the positions and cannot know them. Naming the text is the only form that
  survives the fetch, because the text is the only key you were actually given:

```
survey [
  name "priorities"
  ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json"
  max-choices 3
  response [ selection ["affordable housing" "clean air and water"] ]
]..
```

- **Only when the set is written out in this same program** — an `ideas ["…" "…"]` list you can
  read directly above the response — may an idea be named by **its id** (`selection ["b7" "a3"]`)
  or **its position, counting from 0** (`selection [2 0]` is the third idea then the first).
- **With `ideas fetch` this form is always wrong**, however familiar an id looks. Recalling a
  file's ids is not the same as resolving the request against it: the ids that come to mind are
  the first few in file order, and the request almost never asks for the first few. A response
  that names `["f-104" "f-118" "f-131"]` for a request that asked for undo, offline mode and
  search has recorded three ideas nobody chose — and it compiles, because all three ids are real.
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
| `survey`   | name, title, instructions, ideas, min-choices, max-choices, response |
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

| Word          | Signature          | Arity | Meaning                                                                                                                                                                                                                                                                                                                                                                                     |
| :------------ | :----------------- | :---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`        | `<string: record>` |   1   | The survey this set of ideas was drawn from. It is what ties a response back to the survey it answers, and it is the argument code generation resolves the idea set from.                                                                                                                                                                                                                   |
| `title`       | `<string: record>` |   1   | The survey's title, shown above the ideas.                                                                                                                                                                                                                                                                                                                                                  |
| `instructions` | `<string: record>` |   1   | What the participant is asked to do, in your own words, shown under the title and above the ideas. The bounds line beneath it is derived from min-choices and max-choices, so instructions should say what the survey is FOR rather than restate the count. |
| `ideas`       | `<list: record>`   |   1   | The set of ideas this response is chosen from, written at code generation. Each entry is a line of text, or a record naming the service's own id: ideas ["…" {id: "a3" text: "…"}].                                                                                                                                                                                                         |
| `min-choices` | `<number: record>` |   1   | Fewest ideas a response may select. Defaults to 1.                                                                                                                                                                                                                                                                                                                                          |
| `max-choices` | `<number: record>` |   1   | Most ideas a response may select. Defaults to the number of ideas.                                                                                                                                                                                                                                                                                                                          |
| `selection`   | `<list: record>`   |   1   | The ideas chosen, in priority order — the order IS the ranking, first is most important. Name each one by its exact text: selection ["clean air and water" "affordable housing"]. An id in quotes works too, and a bare whole number is a position counting from 0 — but reach for those only when you can see the set, because a wrong position records the wrong idea and still compiles. |
| `idea`        | `<string: record>` |   1   | One new idea, contributed by whoever answered. It must not repeat an idea already in the set — that is what makes it new.                                                                                                                                                                                                                                                                   |
| `survey`      | `<list: record>`   |   1   | A named set of ideas to choose from, and optionally the response to it.                                                                                                                                                                                                                                                                                                                     |
| `response`    | `<list: record>`   |   1   | The ideas chosen, in priority order, and optionally one new idea that was not in the set.                                                                                                                                                                                                                                                                                                   |
| `fetch`       | `<string: any>`    |   1   | Reads a dataset over HTTP at compile time and evaluates to it: JSON, or CSV as a list of records keyed by its header row. This is how `ideas` gets its set.                                                                                                                                                                                                                                 |

## A full example

```
survey [
  name "you-can-choose"
  title "You Can Choose"
  instructions "Below is a list of things people have said they'd like their representatives to
    focus on. Please click to select the issues that matter most to you."
  ideas fetch "https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json"
  min-choices 1
  max-choices 5
  response [
    selection ["invest in public transit" "protect voting rights"]
    idea "make public transit free at the point of use"
  ]
]..
```
