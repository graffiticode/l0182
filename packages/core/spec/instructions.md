# L0182 — collective-intelligence surveys

L0182 authors a **survey activity**: a participant is shown a sample of ideas from a shared
pool, selects the ones they prefer, ranks them, contributes one of their own, and sees the
group's live ranking.

OUT_OF_SCOPE: assessment and quiz items — anything with a right answer, points, marking or a
rubric. L0182 gathers opinions and does NOT score anyone. Use L0180 for graded questions.
Conventional questionnaires (Likert scales, demographics, satisfaction ratings, branching form
logic) are not built yet. L0182 does NOT own the idea pool, draw the sample or compute the
ranking — the service named in `session` does that.

## The shape of a program

An activity **is a list of items**, followed by the activity's settings, ending in a record.

```
items [
  select [
    prompt "What should we focus on next?"
    sample 10
    max-choices 5
  ]
  rank []
  contribute [ optional ]
  results [ show-scores ]
] title "You Can Choose" session "abc123" {}..
```

Three rules cover every attribute:

| Target shape | How it is written |
| :----------- | :---------------- |
| an item | a word applied to an attribute list — `select [sample 10 max-choices 5]` |
| a scalar, or a list of scalars | the value itself — `sample 10`, `participants ["human"]` |
| the activity's settings | words chained **after** the items list, ending in `{}` |

## The five words that go outside the brackets

These configure the whole activity, so they are written **after** the `items [...]` list and
**before** the closing `{}`. They are the only words in L0182 that take two arguments.

| Word | Values | Meaning |
| :--- | :----- | :------ |
| `title` | string | Shown above every item. |
| `session` | string | The collective-intelligence session this activity draws from and contributes to. |
| `participants` | `["human"]`, `["agent"]`, or both | Which classes may take part. Both when omitted. |
| `navigation` | `"linear"`, `"nonlinear"` | QTI's navigationMode. `linear` (the default) means no going back. |
| `submission` | `"individual"`, `"simultaneous"` | QTI's submissionMode. `individual` (the default) submits each item as it is answered. |

Writing one of these **inside** an item is the most common mistake, and if it is the last word
in the brackets the parser rejects the program before the compiler can explain. Always put them
after the list:

```
items [ select [sample 10 max-choices 5] ] title "Ideas" navigation "linear" {}..
```

The chain must end in a record. Write `{}` when there is nothing to configure:

```
items [ select [sample 8] ] {}..
```

## The items

| Item | What it does |
| :--- | :----------- |
| `start` | Content only. Opens the activity behind a single control. |
| `select` | Shows a sample of ideas; the participant picks the ones they prefer. |
| `rank` | The participant orders the ideas they selected. Needs a `select` before it. |
| `contribute` | The participant adds one idea of their own to the pool. |
| `results` | Content only. The group's current ranking. |
| `thanks` | Content only. Closes the activity. |

Each kind may appear once. `start` comes first, `thanks` last, and an activity must ask the
participant for at least one thing — a `select`, a `rank` or a `contribute`.

## Which words each container takes

| Container | Takes |
| :-------- | :---- |
| `activity` | title, session, participants, navigation, submission |
| `start` | prompt, hint, button |
| `select` | prompt, hint, button, sample, min-choices, max-choices |
| `rank` | prompt, hint, button |
| `contribute` | prompt, hint, button, optional |
| `results` | prompt, hint, button, limit, audience, show-scores, show-participants |
| `thanks` | prompt, hint |

`activity` is not a word — the activity is the program. Its row names the five settings that
chain after the items list.

## What each word means

| Word | Takes | Meaning |
| :--- | :---- | :------ |
| `prompt` | string | The prose shown on this item. |
| `hint` | string | A short line under the prompt. Derived when omitted — `select` and `rank` write their own. |
| `button` | string | The label on the forward control. Defaults to `"Next"`, or `"Start"` on a `start` item. |
| `sample` | number | How many ideas to draw from the pool. Required on `select`. |
| `min-choices` | number | Fewest ideas the participant may select. Defaults to 0. |
| `max-choices` | number | Most ideas they may select. Defaults to `sample`, and can never exceed it. |
| `limit` | number | How many ranked ideas `results` shows. Defaults to 10. |
| `audience` | `"all"`, `"human"`, `"agent"` | Which population the ranking covers. Defaults to `"all"`. |
| `optional` | — | Stands alone. The participant may skip this item. |
| `show-scores` | — | Stands alone. Show each ranked idea's score. |
| `show-participants` | — | Stands alone. Show how many have taken part. |

`optional`, `show-scores` and `show-participants` take **no value**. Write them bare:

```
items [
  select [sample 10 max-choices 3]
  contribute [ optional prompt "Add one idea." ]
  results [ show-scores show-participants limit 5 ]
] {}..
```

## The ideas are not authored

An activity never lists the ideas. They live in the pool the `session` names, they are
contributed by participants, and each participant is shown a different adaptive sample of them
at delivery. `sample 10` says *how many* to draw, not which.

That is also why `rank` carries no list: it orders whatever the `select` before it gathered.

## Humans and agents

The same activity is taken by people through the rendered form and by AI agents through MCP
tools, and both land in the same pool. `participants` says which classes are accepted;
`audience` on a `results` item says which population its ranking covers, so a survey can show
everyone the combined ranking while keeping the two separable:

```
items [
  select [sample 10 max-choices 5]
  rank []
  results [ audience "human" show-scores ]
] participants ["human" "agent"] {}..
```

A participant's class is decided by the server from the route they arrived on. It is never
something the activity or the caller asserts.

## Functions

Every word L0182 adds to the base language. Arity 2 means the word chains — see “The five
words that go outside the brackets” above.

| Word | Signature | Arity | Meaning |
| :--- | :-------- | :---: | :------ |
| `prompt` | `<string: record>` | 1 | The prose shown to the participant on this item. |
| `hint` | `<string: record>` | 1 | A short line under the prompt telling the participant what to do, e.g. "Drag to reorder.". Derived from the item when omitted. |
| `button` | `<string: record>` | 1 | The label on this item's forward control. Defaults to "Next". |
| `sample` | `<number: record>` | 1 | How many ideas to draw from the pool for this participant. The draw is the service's adaptive sample, not a random slice, which is what lets the pool grow without bound. |
| `min-choices` | `<number: record>` | 1 | Fewest ideas the participant may select. Defaults to 0. |
| `max-choices` | `<number: record>` | 1 | Most ideas the participant may select. |
| `limit` | `<number: record>` | 1 | How many ranked ideas to show. Defaults to 10. |
| `audience` | `<string: record>` | 1 | Which population this ranking covers: all participants, humans only, or agents only. Authored rather than a runtime flag, so the result a participant sees is reproducible. |
| `optional` | `<: record>` | 0 | The participant may skip this item. Stands alone — it takes no value. The forward control reads Skip until they enter something. |
| `show-scores` | `<: record>` | 0 | Show each ranked idea's score. Stands alone — it takes no value. |
| `show-participants` | `<: record>` | 0 | Show how many people have taken part. Stands alone — it takes no value. |
| `title` | `<string record: record>` | 2 | The activity's title, shown above every item. |
| `session` | `<string record: record>` | 2 | The collective-intelligence session this activity draws from and contributes to. Every participant of a session shares one idea pool and one ranking. |
| `participants` | `<list record: record>` | 2 | Which classes of participant may take part: human, agent, or both. Both when omitted. |
| `navigation` | `<string record: record>` | 2 | QTI's navigationMode. `linear` (the default) means a participant cannot return to an item they have left; `nonlinear` lets them move freely. |
| `submission` | `<string record: record>` | 2 | QTI's submissionMode. `individual` (the default) submits each item as it is answered, which is what lets a participant resume mid-flow; `simultaneous` holds everything to the end. |
| `items` | `<list record: record>` | 2 | The activity: the items a participant works through, in order, then the activity's configuration. |
| `start` | `<list: record>` | 1 | A content-only item that opens the activity behind a single control. |
| `select` | `<list: record>` | 1 | The participant is shown a sample of ideas from the pool and picks the ones they prefer. |
| `rank` | `<list: record>` | 1 | The participant puts the ideas they selected into order of preference. |
| `contribute` | `<list: record>` | 1 | The participant adds one idea of their own to the pool. |
| `results` | `<list: record>` | 1 | A content-only item showing the group's current ranking. |
| `thanks` | `<list: record>` | 1 | A content-only item that closes the activity. |

## A full example

```
items [
  start [ prompt "This takes about two minutes." button "Start" ]
  select [
    prompt "Below is a list of things people have said they'd like their representatives to focus on. Please click to select up to 5 issues that matter most to you."
    sample 10
    min-choices 0
    max-choices 5
  ]
  rank [
    prompt "These are the ideas that matter the most to you. Drag them up or down to show their order of importance to you."
  ]
  contribute [
    prompt "Please enter only one idea at a time. If you enter several ideas in one statement, people may not vote for it."
    optional
  ]
  results [
    prompt "These are the things that you and others have told us you want your elected leaders to focus on."
    limit 10
    show-scores
    show-participants
  ]
  thanks [ prompt "We hear you! Come back if you have more ideas." ]
] title "You Can Choose" session "6a2ee894b1a5da8a744290db" navigation "linear" submission "individual" {}..
```
