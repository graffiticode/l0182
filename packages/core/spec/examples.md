<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

44 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering creating a survey from a dataset, writing a set of ideas out, the bounds a
response must satisfy, recording a selection in priority order, and contributing a new idea.

Each numbered line is a prompt in the author's own voice. Prompts describe WHAT to build, never
how to write it: an author asks for a survey, not for a `survey [...]` program.

**Every prompt is self-contained.** None assumes a survey created by an earlier prompt, and none
assumes a response has already been recorded — a prompt that wants a response says so and names
what was chosen. A prompt never asks for the ideas to be invented: it either gives the address
they live at or supplies them.

The addresses are L0182's own sample datasets, so these prompts are runnable rather than
illustrative. They differ on purpose — records with ids, bare strings, an id column, a text-only
CSV:

| Dataset                                                                                           | What it holds                                |
| :------------------------------------------------------------------------------------------------ | :------------------------------------------- |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json`         | twelve civic priorities, with ids            |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv`          | the same twelve, as CSV                      |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv`     | eight engineering-team retro ideas, with ids |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json`    | ten city budget ideas, as plain strings      |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json` | nine product feature requests, with ids      |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv`   | seven school improvements, text only         |

## Category 1: Creating a Survey from a Dataset (1–10)

1. Create the 'you-can-choose' survey, reading its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json.
2. Set up a survey named team-retro titled 'What Should We Fix First?', reading its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv.
3. Make a survey called parks-budget whose ideas come from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json.
4. Build a survey named feature-requests from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json, titled 'What Should We Build Next?'.
5. Create a survey record named school-priorities that pulls its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv.
6. Set up the civic-priorities survey reading its ideas from the CSV at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv.
7. I want to answer the city budget survey — read its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json.
8. Make me a survey named product-roadmap from the feature list at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json.
9. Create a survey called sprint-focus that fetches its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv.
10. Build a survey named schools-first, titled 'Where Should the Money Go?', from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv.

## Category 2: Writing the Ideas Out (11–18)

11. Create a survey named team-lunch with these ideas: tacos, ramen, a salad bar, pizza, sandwiches.
12. Make a survey called office-perks from this list — better coffee, standing desks, a quiet room, more plants, secure bike storage.
13. Build a survey named retro-actions with these ideas, keeping the ids from our tracker: r1 pair more often, r2 write smaller PRs, r3 timebox standup, r4 rotate the on-call.
14. Set up a survey named offsite-venue titled 'Where Should We Meet?' with these five venues written out.
15. Create a survey called reading-group whose ideas are the six books I just listed, with no ids of their own.
16. Make a survey named charity-vote from these options, keeping each one's id from our database.
17. Build a survey named conference-talks with these eight submitted titles, in the order I gave them.
18. Create a survey called hackday-themes with these ideas: accessibility, developer tooling, performance, onboarding.

## Category 3: Bounds on a Response (19–26)

19. Create the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json where you may pick at most 5 ideas.
20. Make a survey named team-retro from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv where people choose exactly 3 — no more, no fewer.
21. Set up the parks-budget survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json requiring at least two choices.
22. Create a survey named office-perks with these ideas — better coffee, standing desks, a quiet room, more plants — capped at 2 choices.
23. Build the feature-requests survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json where choosing none is allowed, up to a maximum of 5.
24. Make a survey named school-priorities from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv requiring between 2 and 4 choices.
25. Create a survey named team-lunch with these ideas — tacos, ramen, a salad bar, pizza — where exactly one may be chosen.
26. Set up the civic-priorities survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv limited to the top 3, with at least one required.

## Category 4: Recording a Selection (27–36)

27. Create the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json and record that I chose affordable housing, then clean air and water, then strengthen public schools.
28. Set up a survey named team-retro from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv and save my answer: cut the build time in half first, then write smaller pull requests.
29. Make the parks-budget survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and record a response naming just one idea — extend library hours into the evening.
30. Create a survey named office-perks with these ideas — better coffee, standing desks, a quiet room, more plants — and record that I picked standing desks then better coffee.
31. Build the feature-requests survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json and save my three choices in priority order: undo on everything, offline mode, then search across everything.
32. Create a survey named retro-actions with these ideas — pair more often, write smaller PRs, timebox standup — and record that I chose the first and third, in that order.
33. Set up the civic-priorities survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv and record my ranking with universal healthcare system at the top, then affordable housing.
34. Make the school-priorities survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv and record that I chose smaller class sizes in the early grades, then free breakfast for every student.
35. Create the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json allowing up to 3 choices, and record that I picked invest in public transit first, then mitigate climate change.
36. Build a survey named hackday-themes with these ideas — accessibility, developer tooling, performance, onboarding — and record accessibility as my only choice.

## Category 5: Contributing a New Idea (37–44)

37. Create the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json and record my answer: affordable housing and clean air and water, plus an idea of my own — make public transit free at the point of use.
38. Set up the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json allowing no choices at all, and record only a new idea of mine: expand access to preventive dental care.
39. Make a survey named office-perks with these ideas — better coffee, standing desks, a quiet room — and record that I picked standing desks and added my own: a nap room.
40. Create the parks-budget survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and save my two choices along with one suggestion of my own.
41. Build the team-retro survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv and record one chosen idea plus one contributed idea.
42. Set up a survey named team-lunch with these ideas — tacos, ramen, a salad bar, pizza — and record that I chose ramen and suggested dumplings.
43. Create the feature-requests survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json and record a ranked selection of two features plus a new idea that is not already in the list.
44. Make the school-priorities survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv, requiring at least one choice, and record my pick of air conditioning in every classroom with my own idea: a hot lunch that children will actually eat.
