<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# L0182

L0182 authors a **survey activity** for collective intelligence: a participant is shown a
sample of ideas drawn from a shared pool, selects the ones they prefer, ranks them, contributes
one of their own, and sees the group's live ranking.

An L0182 program is one activity.

## Structure

An activity **is a list of items**, followed by its settings, terminated by a record. This is
L0176's shape and QTI's delivery vocabulary: an `assessmentTest` carries a `navigationMode` and
a `submissionMode` over an ordered list of items.

```
items [ select [sample 10 max-choices 5] ] {}..
```

Sections are deliberately absent. A section carries a rule over a *group* of items — a random
draw from a bank, an ordering, a shared rubric — and a survey activity has no such group. The
survey's own sampling is not that construct: `sample` draws ideas from a live,
participant-contributed pool at delivery, not authored items from a bank.

## Items

Six kinds, each appearing at most once.

```
items [
  start [ prompt "Two minutes, anonymous." ]
  select [ prompt "Which matter most?" sample 10 max-choices 5 ]
  rank []
  contribute [ prompt "Add one idea." optional ]
  results [ limit 5 show-scores ]
  thanks [ prompt "Thank you." ]
] title "Priorities" {}..
```

`start`, `results` and `thanks` present content. `select`, `rank` and `contribute` capture
something, and an activity must contain at least one of them.

`start` comes first and `thanks` last. `rank` needs a `select` before it, because it orders the
ideas that item gathered — which is also why it carries no list.

## The activity's settings

Five words chain after the items list and before the closing record. They are the only arity-2
words in the language.

```
items [ select [sample 8] ]
  title "Ideas"
  session "abc123"
  participants ["human" "agent"]
  navigation "linear"
  submission "individual"
  {}..
```

`navigation` and `submission` are QTI's modes. `linear` prevents returning to an item already
left; `individual` submits each item as it is answered, which is what lets a participant resume
mid-activity. Both are the defaults.

## Selection bounds

```
items [ select [sample 12 min-choices 1 max-choices 3] ] {}..
```

`min-choices` defaults to 0 and `max-choices` to `sample`. `max-choices` can never exceed
`sample` — a participant cannot pick more ideas than they were shown — and `min-choices` can
never exceed `max-choices`.

## Results and audience

```
items [
  select [sample 10 max-choices 5]
  results [ audience "human" limit 10 show-scores show-participants ]
] participants ["human" "agent"] {}..
```

An activity may be taken by people through the rendered form and by AI agents through MCP
tools, into the same pool. `participants` says which classes are accepted; `audience` says
which population a ranking covers, so the two stay separable without being separated.

A participant's class is assigned by the server from the route the request arrived on. It is
never authored and never accepted from the caller.

## Compiled output

```json
{
  "activity": {
    "title": "Priorities",
    "participants": ["human", "agent"],
    "navigation": "linear",
    "submission": "individual",
    "items": [
      { "id": 0, "type": "select", "sample": 10, "minChoices": 0, "maxChoices": 5,
        "hint": "Please select 0–5 ideas below." }
    ]
  }
}
```

Item ids are positions in the authored order, from 0, and are what an answer is keyed by. A
participant's `response` is attached by the delivery loop; the compiler never emits it.

## Flags

`optional`, `show-scores` and `show-participants` stand alone and take no value.

```
items [ select [sample 6] contribute [optional] results [show-scores] ] {}..
```
