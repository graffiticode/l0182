<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182

L0182 is a **survey record**: the options someone was asked to choose
between, and the response to them — the options chosen, in priority order, plus one new option that
was not in the set.

An L0182 program is one taking of one survey and at most one response to it.

## Structure

```
survey [
  id "civic-priorities"
  session-id get-val-public "itemId"
]..
```

That is a whole program. The options are **given, never written**: they belong to the survey, which
the compiler reads when the program compiles. Nothing in the language describes a set of options,
a title, an instruction line or a bound — a survey cannot be authored here at all, and whoever
takes one has not seen it before the first compile. What is written afterwards is the response.

There is no flow in this language either. It does not describe screens, steps, navigation or
submission, and nothing in it takes a participant through anything. The code is the interface: a
person writes it in the console's editor, an agent writes it through `update_item`, and both
produce the same record.

## Taking a survey

`id` names a survey the language server holds — `civic-priorities`, `team-retro`, `city-budget`,
`product-features`, `school`. An id that does not exist is a compile error listing the ones that
do.

A survey may have **several versions**, one per file: `civic-priorities-1`, `civic-priorities-2`, and
so on, each a different set of options drawn from the same subject. Naming the survey takes one of
them at random; which one is recorded as `instance` in the compiled record. Versions are drawn
without replacement, so successive takings work through them rather than piling onto one.

```
survey [ id "civic-priorities-7" ]..
```

Naming a version outright takes exactly that one, with no draw.

### The session

`session-id` identifies one taking of the survey, and every program should carry it, written
exactly as:

```
survey [ id "civic-priorities" session-id get-val-public "itemId" ]..
```

`get-val-public` resolves at parse time, so the program carries the value from then on. A survey
is drawn once per session: the turn that adds a response comes back to the same session and gets
the same version, which is what keeps the answer with the options its taker actually saw.

That memory lives in the language server's process. A restart, or a second server instance, loses
it and the session is drawn for again. Naming the version as the id is what makes an answer
immune.

## What a survey holds

A survey is one JSON file per version, and everything the survey is lives in it — the words a
participant reads, the options, and the bounds a response must satisfy:

```json
{
  "title": "What Matters Most?",
  "instructions": "Below is a list of things people have said they'd like their representatives to focus on. Please select the issues that matter most to you.",
  "minChoices": 1,
  "maxChoices": 3,
  "options": [
    { "id": "a3", "text": "protect voting rights" },
    { "id": "b7", "text": "affordable housing" }
  ]
}
```

An option is a line of text, or a record naming the id the originating service knows it by. An
entry that names its own id keeps it — a selection of positional ids would mean nothing back at
that service — and one that does not is numbered by position, `o0` upward. A set needs at least
two options, and no two may repeat the same text or share an id.

An option's id is always a string, even when it looks like a number.

`minChoices` and `maxChoices` are optional. They default to 1 and 5 — or to one fewer than the set when the set is smaller, so a default never lets a response
name every option there is. Choosing everything is not choosing.

## The response

```
survey [
  id "team-retro"
  session-id get-val-public "itemId"
  response [
    choices ["cut the build time in half" "write smaller pull requests"]
    write-in "give every service a named owner"
  ]
]..
```

`choices` names the options chosen, and **the order is the ranking** — first is most important.
No option may appear twice.

An option may be named three ways: by **its exact text**, by **its id**, or by **its position,
counting from 0**. All three resolve to ids in the compiled record, so they differ only in the
source.

Which to use is not a matter of taste. The options live in the survey, so whoever writes a response
has not seen the ids or the positions, and the text is the only thing they can know. Naming a
position there is a guess, and a guess that lands in range compiles cleanly and records the wrong
options. Once the compiled survey has been read back, the id is the better key: it survives the set
being reordered.

Text matching ignores case and surrounding whitespace. A number is always a position and a string
never is, so those cannot collide even when a set's ids look like numbers — `choices [1]` is the
second option, `choices ["1"]` is the option whose id is `1`. Between the two string forms, an id
wins.

`write-in` is one new option, contributed by whoever answered. It must not repeat an option already in
the set; that is what makes it new. It may stand alone, with nothing selected, where the survey's
floor allows it.

`response` is written inside the survey's brackets and lifted to the top level of the compiled
record. A survey with no `response` is one awaiting an answer.

Because there is no player, the survey's bounds are enforced only here: the compiler is what
refuses a response that breaks them.

## Compiled output

```json
{
  "survey": {
    "id": "team-retro",
    "sessionId": "7gMeEzUYkHqm3PDRrI8i",
    "instance": "team-retro-1",
    "title": "What Should We Fix First?",
    "instructions": "These came out of last sprint's retro…",
    "options": [
      { "id": "t1", "text": "fix the flaky tests before adding features" },
      { "id": "t2", "text": "cut the build time in half" },
      { "id": "t3", "text": "write smaller pull requests" }
    ],
    "minChoices": 1,
    "maxChoices": 3
  },
  "response": { "choices": ["t2", "t3"], "option": "give every service a named owner" }
}
```

The renderer shows these side by side: the set as it was drawn on the left, and what came back —
the selection in priority order, and the new option — on the right.
