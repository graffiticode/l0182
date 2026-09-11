# L0182 — collective-intelligence surveys

L0182 is a **survey record**: the ideas someone was asked to choose between, and the response to
them — the ideas chosen in priority order, plus one new idea that was not in the set.

OUT_OF_SCOPE: assessment and quiz items — anything with a right answer, points, marking or a
rubric. L0182 gathers opinions and does NOT score anyone. Use L0180 for graded questions.
Conventional questionnaires (Likert scales, demographics, satisfaction ratings, branching form
logic) are not built yet. L0182 does NOT implement a survey-taking flow: it has no screens,
steps, navigation or submission, and it never aggregates across respondents. **Surveys are NOT
authored here**: a program cannot write the ideas, the title, the wording or the bounds, and
there is no word for any of them.

## The shape of a program

One word, `survey`, applied to an attribute list. A program names the survey being taken and
says nothing else about it — the ideas come from the survey itself, when the program compiles.

```
survey [
  id "you-can-choose"
  session-id get-val-public "itemId"
]..
```

That is a whole program: it takes the survey called `you-can-choose` and records what that
person was shown. The ideas, the title, the instructions and the bounds all come back in the
compiled record, and nothing in the program can change them.

**Write `session-id get-val-public "itemId"` in every program, exactly like that.** It is one
taking of the survey, and it is what keeps an answer with the version of the survey it answers —
see "Answering" below. Copy the line verbatim; never write an id of your own.

Every word in the language takes exactly one argument. Nothing chains, and nothing takes a
trailing record.

| Target shape                | How it is written                                                          |
| :-------------------------- | :------------------------------------------------------------------------- |
| the survey, or the response | a word applied to an attribute list — `response [selection ["…"]]`         |
| a scalar                    | the value itself — `id "you-can-choose"`                                   |
| a list                      | the list itself — `selection ["clean air and water" "affordable housing"]` |

## The surveys you can take

An `id` names a survey the language server holds. These are installed:

| `id`               | The survey                                                                                                  | Choices |
| :----------------- | :---------------------------------------------------------------------------------------------------------- | :------ |
| `you-can-choose`   | civic priorities — what people want their representatives to work on. Twelve versions; taking it draws one. | 1–5     |
| `team-retro`       | eight things an engineering team could fix first, from a sprint retro                                       | 1–3     |
| `city-budget`      | ten neighbourhood projects a city council could fund                                                        | 0–2     |
| `product-features` | nine features customers have asked for                                                                      | 2–4     |
| `school`           | seven school improvements                                                                                   | 0–3     |

An id that does not exist is a compile error listing the ones that do — so if you are unsure,
write your best guess and read the error rather than inventing a survey. The choice counts are
the survey's own and cannot be changed from a program; a response outside them is refused.

**A survey may have several versions**, one per file: `you-can-choose-1`, `you-can-choose-2`, and
so on. Naming the survey (`id "you-can-choose"`) draws one of them, and which one is recorded as
`instance` in the compiled record. Naming a version outright (`id "you-can-choose-7"`) takes
exactly that one.

## Answering

The response is written into the same program:

```
survey [
  id "team-retro"
  session-id get-val-public "itemId"
  response [
    selection ["fix the flaky tests before adding features" "cut the build time in half"]
    idea "give every service a named owner"
  ]
]..
```

- `selection` names the ideas chosen, and **the order is the ranking** — first is most important.
  No idea may appear twice.
- **Name each idea by its exact text.** This is the important rule. The ideas live in the survey,
  not in the program, so you have not seen the ids or the positions and cannot know them. The
  text is the only key you were actually given.
- An id in quotes (`selection ["t3"]`) or a position counting from 0 (`selection [2 0]`) is
  accepted **only when you can see the set** — when the compiled survey is in front of you. A
  guessed position lands in range and records the wrong ideas without failing.
- Text matching ignores case and surrounding space, but the words must be the idea's own.
- A number is always a position and a string is never one, so those cannot be confused even for a
  set whose ids look like numbers: `selection [1]` is the second idea, `selection ["1"]` is the
  idea whose id is `1`. Between the two string forms an id wins.
- `idea` is one new idea from whoever answered. It must NOT repeat an idea already in the set —
  that is what makes it new. It may stand alone, with nothing selected, where the survey's floor
  allows it.

`response` is written inside the survey's brackets and lifted to the top level of the compiled
record. A program with no `response` is a survey awaiting one.

**Keep `session-id` when you add a response.** A survey with several versions draws one per
session, and the session is what brings back the same version on the turn that answers. A
response written without it may be checked against a different version of the survey — which
fails outright when a name matches nothing, and silently records ideas nobody chose when it
does. If the compiled survey is in front of you, writing its `instance` as the id
(`id "you-can-choose-7"`) pins it beyond doubt.

## Which words each container takes

| Container  | Takes                    |
| :--------- | :----------------------- |
| `survey`   | id, response, session-id |
| `response` | selection, idea          |

## What the survey brings with it

The compiled record carries what the survey says, none of which a program can write:

- `title` and `instructions` — the words a participant reads.
- `ideas` — the set, each with an id. The id is the originating service's own where the survey's
  data carried one, and positional (`i0` upward) where it did not.
- `minChoices` and `maxChoices` — how many a response may name. A selection is checked against
  both, and the compiler is the only check there is: nothing enforces them at delivery, because
  there is no delivery.
- `instance` — which version of the survey was taken.

## There is no flow

L0182 does not describe screens, steps, ordering, navigation or submission. It does not hold a
pool and does not aggregate anything across respondents. A program is one taking of one survey
and at most one response to it.

The code IS the interface: a person edits the program in the console, an agent edits it through
`update_item`, and both produce the same record. The renderer shows the set as it was drawn
beside what came back.

## Functions

Every word L0182 adds to the base language. All are arity 1.

| Word         | Signature          | Arity | Meaning                                                                                                                                                                                                                                                                                                                                                                                     |
| :----------- | :----------------- | :---: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `<string: record>` |   1   | The survey being taken, e.g. id "you-can-choose". The ideas, the wording and the bounds all come from the survey itself — the program names it and nothing more. An id naming one version outright (id "you-can-choose-7") takes that version rather than drawing one.                                                                                                                      |
| `session-id` | `<string: record>` |   1   | One taking of a survey. Write it exactly as `session-id get-val-public "itemId"` — it is what keeps a response with the version of the survey it answers.                                                                                                                                                                                                                                   |
| `selection`  | `<list: record>`   |   1   | The ideas chosen, in priority order — the order IS the ranking, first is most important. Name each one by its exact text: selection ["clean air and water" "affordable housing"]. An id in quotes works too, and a bare whole number is a position counting from 0 — but reach for those only when you can see the set, because a wrong position records the wrong idea and still compiles. |
| `idea`       | `<string: record>` |   1   | One new idea, contributed by whoever answered. It must not repeat an idea already in the set — that is what makes it new.                                                                                                                                                                                                                                                                   |
| `survey`     | `<list: record>`   |   1   | The survey being taken, and optionally the response to it. The ideas themselves come from the survey, not from the program.                                                                                                                                                                                                                                                                 |
| `response`   | `<list: record>`   |   1   | The ideas chosen, in priority order, and optionally one new idea that was not in the set.                                                                                                                                                                                                                                                                                                   |

## A full example

```
survey [
  id "city-budget"
  session-id get-val-public "itemId"
  response [
    selection ["plant shade trees along the bus routes" "extend library hours into the evening"]
    idea "a late bus home on weekends"
  ]
]..
```

Note what is NOT here: no ideas, no title, no instructions, no bounds. Writing any of them is a
compile error, because none of them is the program's to say.
