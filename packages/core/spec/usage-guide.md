<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Using L0182

## Overview

L0182 authors a survey activity for collective intelligence. A participant is shown a sample of
ideas drawn from a shared pool, selects the ones they prefer, ranks those selections, may add
one idea of their own, and sees the group's current ranking. An activity is an ordered list of
items — `start`, `select`, `rank`, `contribute`, `results`, `thanks` — each appearing at most
once, followed by the activity's settings and a closing record.

The ideas are never authored. They belong to the session named in `session`, they are
contributed by participants, and both the adaptive sample and the ranking are computed by the
collective-intelligence service at delivery. An activity declares parameters — how many ideas to
draw, how many may be picked, which population a ranking covers — and nothing else. The same
activity is taken by people through the rendered form and by AI agents through MCP tools, into
one pool.

An L0182 program is one **survey activity**: an ordered list of items a participant works
through, plus the settings that govern how they move between them.

## Getting started

The smallest useful activity shows a sample of ideas and collects a choice:

```
items [ select [sample 10 max-choices 5] ] {}..
```

`sample 10` draws ten ideas from the pool for this participant. It does not say *which* ten —
the session's adaptive sampler decides, so no two participants necessarily see the same set,
which is what lets the pool grow without bound.

## Building up the flow

```
items [
  start [ prompt "This takes about two minutes." ]
  select [ prompt "Which of these matter most to you?" sample 10 max-choices 5 ]
  rank []
  contribute [ prompt "Add an idea of your own." optional ]
  results [ show-scores show-participants ]
  thanks [ prompt "Thanks — come back any time." ]
] title "Team Priorities" session "abc123" {}..
```

Each kind appears at most once. `rank` needs a `select` before it, because it orders what that
item gathered.

## Where the settings go

The five activity settings — `title`, `session`, `participants`, `navigation`, `submission` —
are written **after** the items list, and the chain ends in `{}`. Putting one inside an item is
the most common mistake; if it is the last word in the brackets, the program will not even
parse.

## Who takes part

The same activity is taken by people through the form and by AI agents through MCP tools, into
one pool. Say which classes you accept, and which population a ranking covers:

```
items [
  select [sample 10 max-choices 5]
  results [ audience "human" show-scores ]
] participants ["human" "agent"] {}..
```

A participant's class is set by the server from the route they arrived on, so an activity never
has to ask and a caller can never claim to be something it is not.

## What you do not author

The ideas. They belong to the session, they are contributed by participants, and both the
sample and the ranking are computed by the collective-intelligence service at delivery. An
activity declares the parameters and nothing else.
