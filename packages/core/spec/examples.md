<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

50 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering answering a survey, putting the chosen ideas in priority order, contributing
one idea of your own, and answering within the bounds a survey sets.

**These are prompts for answering. There is nothing else to ask for.** A survey cannot be
written here: its ideas, its title, its wording and its bounds belong to the survey itself, and
a program names the survey and adds a response. So what varies from one prompt to the next is
the response — which ideas are favoured, the order they are put in, and what new idea is added.

**Most prompts leave the choosing to whoever answers.** A request that dictates every pick
teaches transcription; a request that says "choose the three you think matter most" is the one
that actually exercises judgement, which is the interesting part of answering. Both appear here,
because a person recording their own answer really does dictate it — but the deciding kind
dominates, and the contributed idea is almost always left to the responder to think of.

Each numbered line is a prompt in the requester's own voice. Prompts describe WHAT to record,
never how to write it: someone asks for an answer, not for a `response [...]`.

**Every prompt is self-contained**, and each names a survey the language server holds. None
assumes a survey created by an earlier prompt, and none asks for ideas to be invented — a
selection means nothing without the set it was chosen from, and the set is not the writer's to
supply.

| `id`               | The survey                                                               |
| :----------------- | :----------------------------------------------------------------------- |
| `you-can-choose`   | civic priorities — twelve versions, one drawn per taking                 |
| `team-retro`       | eight engineering-team retro ideas, with the service's own ids           |
| `city-budget`      | ten city budget ideas, as plain strings                                  |
| `product-features` | nine product feature requests, with ids                                  |
| `school`           | seven school improvements, from a text-only CSV with no title of its own |

Every idea named below is one its survey actually contains. A selection naming an idea the set
does not hold is a compile error, so a prompt that invents one teaches the wrong thing. Prompts
that name ideas outright use a survey with a single version, because `you-can-choose` draws one
of twelve and only the response's author can see which.

## Category 1: Answering With Your Own Judgement (1–12)

1. Answer the retro survey `team-retro` — read the eight ideas and choose the three you think would help an engineering team most, in order.
2. Take the city budget survey `city-budget` and pick the two you would fund first. Say them in priority order.
3. Answer the school survey `school`, choosing what you judge would do the most good for students.
4. Work through the feature survey `product-features` and record the three features you would build first.
5. Answer the survey `team-retro` — decide for yourself which single idea matters most and record just that one.
6. Here is the city budget set at `city-budget`. Choose four and rank them by how many people each would reach.
7. Answer `product-features` as an engineer who has to maintain the thing: pick the two you would want most.
8. Answer `school` and record the answer you think a teacher would give, three choices in order.
9. Answer the retro survey `team-retro` picking the ideas that address causes rather than symptoms.
10. Take `city-budget` and choose whatever you would pick if the budget only stretched to two of them.
11. Answer the survey `city-budget` for me — I pick the shade trees along the bus routes, and extending library hours into the evening.
12. Record my answer to `school`: smaller class sizes in the early grades, and free breakfast for every student.

## Category 2: Ranking What You Chose (13–20)

13. Answer `team-retro` with four choices, ordered so the one you would do this week is first.
14. Pick five from `city-budget` and rank them, most urgent first.
15. Answer the feature survey `product-features` and order your picks by how many users each would help.
16. Choose three from `school` and rank them by what a student would notice soonest.
17. Answer `team-retro` ranking your choices by how much time each would save the team.
18. Take `city-budget`, pick three, and put the cheapest one last.
19. Answer the survey `team-retro` with cutting the build time in half first, then the flaky tests, then smaller pull requests.
20. Record my top three from `product-features` in priority order: search across everything, not just the current page; then export to CSV and PDF; then a dark theme that respects the system setting.

## Category 3: Contributing an Idea of Your Own (21–32)

21. Answer the retro survey `team-retro` with two choices, and add an idea of your own that the list is missing.
22. Take the city budget survey `city-budget`, pick three, and contribute something the council has clearly not thought of.
23. Answer `school` and add one idea of your own — something no one on the list proposed.
24. Answer the feature survey `product-features` with your two favourites plus a feature you would want that is not offered.
25. Choose one from `team-retro` and add your own idea about how the team works, not what it builds.
26. Answer `city-budget` with a selection and a contribution that would cost almost nothing.
27. Take `product-features`, pick what you like, and add an idea aimed at people who use the product every day.
28. Answer the school survey `school` with two choices and one idea of your own about what happens outside the classroom.
29. Answer `team-retro` and contribute an idea that would make the other eight easier to do.
30. Pick two from `city-budget` and add something for the people the list overlooks.
31. Answer the survey `product-features` with offline mode and undo, plus an idea of my own: let me pin the three views I actually use.
32. Record my answer to `school` — air conditioning in every classroom, plus one of mine: a hot lunch children will actually eat.

## Category 4: A New Idea and Nothing Chosen (33–38)

33. None of the retro ideas at `team-retro` get at what actually slows a team down. Choose nothing and record your own idea instead.
34. Answer `city-budget` without picking anything from the list — just the one thing you would do instead.
35. Answer `product-features`, decide none of it is the right priority, and record only your own idea.
36. Answer the school survey `school` with no selection and a single contribution.
37. Answer the survey `you-can-choose` without choosing any of the listed ideas — just record mine: expand access to preventive dental care.
38. I don't want to pick from the list at `school`. Just put down my idea: pay teaching assistants a living wage.

## Category 5: Answering Within the Survey's Bounds (39–46)

39. The survey `team-retro` asks for exactly 3. Choose the three you think matter most.
40. Answer `city-budget` where at most 2 may be chosen — decide which two.
41. `product-features` allows between 2 and 4 choices. Answer it with your own picks, in order.
42. Answer the school survey `school` where only one may be chosen. Pick the one that would help most.
43. `team-retro` allows choosing none, up to 4. Record whatever you actually think, even if that is a single idea.
44. Answer `city-budget` requiring at least one choice, and add an idea of your own as well.
45. The survey `school` lets people pick at most 5. Record my three: free breakfast for every student, smaller class sizes in the early grades, and air conditioning in every classroom.
46. Answer `school`, which asks for between 2 and 4, with more counsellors, free breakfast for every student, and later start times for high school.

## Category 6: Answering From a Particular Point of View (47–50)

47. Answer the school survey `school` the way a parent of a five-year-old would, and add the idea they would add.
48. Answer `city-budget` as someone who does not own a car.
49. Take the retro survey `team-retro` as the person who carries the pager, and contribute an idea from that experience.
50. Answer `product-features` as a customer who has been asking for the same thing for two years.
