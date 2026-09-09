<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

52 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering answering a survey, putting the chosen ideas in priority order, contributing
one idea of your own, answering within the bounds a survey sets, and setting a survey up for
other people to answer.

**These are prompts for answering, not for authoring.** The sets themselves are fixed — they
live in this repository and do not change — so what varies from one prompt to the next is the
response: which ideas are favoured, the order they are put in, and what new idea is added. The
record holds the set and the response together, so a program written from an answering prompt
still names the set the answer was chosen from; the request that produces it is nonetheless an
answer, not a survey. Only the last category asks for a set with no response in it.

**Most prompts leave the choosing to whoever answers.** A request that dictates every pick
teaches transcription; a request that says "choose the three you think matter most" is the one
that actually exercises judgement, which is the interesting part of answering. Both appear here,
because a person recording their own answer really does dictate it — but the deciding kind
dominates, and the contributed idea is almost always left to the responder to think of.

Each numbered line is a prompt in the requester's own voice. Prompts describe WHAT to record,
never how to write it: someone asks for an answer, not for a `response [...]`.

**Every prompt is self-contained.** None assumes a survey created by an earlier prompt — a
prompt that records a response also says where the ideas come from, because a selection means
nothing without the set it was chosen from. A prompt never asks for the ideas to be invented: it
either gives the address they live at or supplies them.

The addresses are L0182's own sample datasets, so these prompts are runnable rather than
illustrative. They differ on purpose — records with ids, bare strings, an id column, a text-only
CSV. **Every JSON set is an envelope carrying its own title and instructions; the CSVs are bare
lists**, so a prompt naming a CSV is one where those words have to be written from the request:

| Dataset                     | What it holds                                              |
| :-------------------------- | :--------------------------------------------------------- |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json`         | twelve civic priorities, with ids — envelope               |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json`    | eight engineering-team retro ideas, with ids — envelope    |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json`    | ten city budget ideas, as plain strings — envelope         |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json` | nine product feature requests, with ids — envelope         |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json`  | seven school improvements, text only — envelope            |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv`          | the same twelve civic priorities, bare CSV                 |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv`     | the same eight retro ideas, bare CSV                       |
| `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv`   | the same seven school improvements, text-only bare CSV     |

Every idea named below is one the dataset actually contains. A selection that names an idea the
set does not hold is a compile error, so a prompt that invents one teaches the wrong thing.

## Category 1: Answering With Your Own Judgement (1–12)

1. Answer the retro survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json — read the eight ideas and choose the three you think would help an engineering team most, in order.
2. Take the city budget survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and pick the two you would fund first. Say them in priority order.
3. Answer the school survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json, choosing what you judge would do the most good for students.
4. Work through the feature survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json and record the three features you would build first.
5. Answer the survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv — decide for yourself which single idea matters most and record just that one.
6. Here is the city budget set at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json. Choose four and rank them by how many people each would reach.
7. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json as an engineer who has to maintain the thing: pick the two you would want most.
8. Read https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv and record the answer you think a teacher would give, three choices in order.
9. Answer the retro survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json picking the ideas that address causes rather than symptoms.
10. Take https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and choose whatever you would pick if the budget only stretched to two of them.
11. Answer the survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json for me — I pick affordable housing and clean air and water.
12. Record my answer to https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json: smaller class sizes in the early grades, and free breakfast for every student.

## Category 2: Ranking What You Chose (13–20)

13. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json with four choices, ordered so the one you would do this week is first.
14. Pick five from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and rank them, most urgent first.
15. Answer the feature survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json and order your picks by how many users each would help.
16. Choose three from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json and rank them by what a student would notice soonest.
17. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv ranking your choices by how much time each would save the team.
18. Take https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json, pick three, and put the cheapest one last.
19. Answer the survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json with universal healthcare system first, then affordable housing, then clean air and water.
20. Record my top three from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json in priority order: search across everything, not just the current page; then export to CSV and PDF; then a dark theme that respects the system setting.

## Category 3: Contributing an Idea of Your Own (21–32)

21. Answer the retro survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json with two choices, and add an idea of your own that the list is missing.
22. Take the city budget survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json, pick three, and contribute something the council has clearly not thought of.
23. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json and add one idea of your own — something no one on the list proposed.
24. Answer the feature survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json with your two favourites plus a feature you would want that is not offered.
25. Choose one from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv and add your own idea about how the team works, not what it builds.
26. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json with a selection and a contribution that would cost almost nothing.
27. Take https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json, pick what you like, and add an idea aimed at people who use the product every day.
28. Answer the school survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv with two choices and one idea of your own about what happens outside the classroom.
29. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json and contribute an idea that would make the other eight easier to do.
30. Pick two from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json and add something for the people the list overlooks.
31. Answer the survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json with affordable housing and clean air and water, plus an idea of my own: make public transit free at the point of use.
32. Record my answer to https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json — air conditioning in every classroom, plus one of mine: a hot lunch children will actually eat.

## Category 4: A New Idea and Nothing Chosen (33–38)

33. None of the retro ideas at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json get at what actually slows a team down. Choose nothing and record your own idea instead.
34. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json without picking anything from the list — just the one thing you would do instead.
35. Read https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json, decide none of it is the right priority, and record only your own idea.
36. Answer the school survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json with no selection and a single contribution.
37. Answer the survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json without choosing any of the listed ideas — just record mine: expand access to preventive dental care.
38. I don't want to pick from the list at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv. Just put down my idea: pay teaching assistants a living wage.

## Category 5: Answering Within the Survey's Bounds (39–46)

39. The survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json asks for exactly 3. Choose the three you think matter most.
40. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json where at most 2 may be chosen — decide which two.
41. https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json allows between 2 and 4 choices. Answer it with your own picks, in order.
42. Answer the school survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json where only one may be chosen. Pick the one that would help most.
43. https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.csv allows choosing none, up to 4. Record whatever you actually think, even if that is a single idea.
44. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json requiring at least one choice, and add an idea of your own as well.
45. The survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json lets people pick at most 5. Record my three: affordable housing, clean air and water, invest in public transit.
46. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.csv, which asks for between 2 and 4, with more counsellors, free breakfast for every student, and later start times for high school.

## Category 6: Answering From a Particular Point of View (47–50)

47. Answer the school survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-school.json the way a parent of a five-year-old would, and add the idea they would add.
48. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-city.json as someone who does not own a car.
49. Take the retro survey at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json as the person who carries the pager, and contribute an idea from that experience.
50. Answer https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-product.json as a customer who has been asking for the same thing for two years.

## Category 7: Preparing a Set for Others to Answer (51–52)

51. Set up the you-can-choose survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json so people can record what they picked, titled 'You Can Choose', telling them the list is what others have said they'd like their representatives to focus on and to select the issues that matter most.
52. Prepare a survey named team-retro from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas-team.json for the team to answer, explaining that these came out of last sprint's retro and asking what we should fix first, with at most 3 choices.
