<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

50 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering taking a survey, answering it, putting the chosen ideas in priority order,
contributing one idea of your own, and answering within the bounds a survey sets.

**Every example starts by OPENING a survey, and most then take it in a second turn.** Those are
two distinct requests against the same item, and they are written here as `Turn 1` and `Turn 2`:

- **Turn 1 creates the item.** The program names the survey and the session — nothing else —
  and compiles to the survey the taker was given: its ideas, its title, its instructions and its
  bounds, along with which version was drawn. There is no response yet.
- **Turn 2 edits that same item**, adding `response [...]` to the program Turn 1 produced. The
  survey is not written again and the ideas are not restated: the program keeps its `id` and its
  `session-id`, which is what brings back the version this taker was actually shown.

**Turn 2 is short because Turn 1 already answered the questions it would otherwise have to ask.**
Whoever writes the response has the compiled record of Turn 1 in front of them — the ideas in
their own words, how many may be chosen, whether none is allowed — so "take the survey" is a
complete request. A Turn 2 that recites the set is restating what it can already see, and a Turn 2
that recites the bounds is quoting the survey back to itself. What Turn 2 adds is only what the
record cannot supply: whose answer this is, what it is optimising for, whether an idea of one's own
comes with it, and — when the person really is dictating their own picks — which ideas those are.

A prompt with only a Turn 1 is complete as it stands — a survey awaiting an answer is a real
thing to ask for. A prompt with both is two turns, never one, and Turn 2 assumes the item Turn 1
made.

**A survey cannot be created here.** Its ideas, wording and bounds belong to the survey itself,
and no word writes them — so "take the team-retro survey" means take the one that exists, and
there is no prompt anywhere below that invents a set of ideas.

**Most prompts leave the choosing to whoever answers.** A request that dictates every pick
teaches transcription; a request that says "take it" and lets the responder weigh the ideas is the
one that actually exercises judgement, which is the interesting part of answering. Both appear
here, because a person recording their own answer really does dictate it — but the deciding kind
dominates, and the contributed idea is almost always left to the responder to think of.

Each turn is written in the requester's own voice. Prompts describe WHAT to record, never how to
write it: someone asks for an answer, not for a `response [...]`.

| `id`               | The survey                                               | Choices |
| :----------------- | :------------------------------------------------------- | :------ |
| `you-can-choose`   | civic priorities — twelve versions, one drawn per taking | 1–5     |
| `team-retro`       | eight engineering-team retro ideas                       | 1–3     |
| `city-budget`      | ten neighbourhood projects a council could fund          | 0–2     |
| `product-features` | nine features customers have asked for                   | 2–4     |
| `school`           | seven school improvements                                | 0–3     |

The bounds are the survey's own and no prompt sets them. Every idea named below is one its survey
actually contains, and a selection naming an idea the set does not hold is a compile error.
Prompts that name ideas outright use a survey with a single version, because `you-can-choose`
draws one of twelve and only the taker can see which.

## Category 1: Taking a Survey (1–6)

1. **Turn 1** — Take the `team-retro` survey.
2. **Turn 1** — Give me the `you-can-choose` survey to answer.
3. **Turn 1** — Set up `city-budget` so I can record what I picked.
4. **Turn 1** — Open the `school` survey — I want to see what is on the list before I decide.
5. **Turn 1** — Take `product-features`, and tell me how many I am allowed to choose.
6. **Turn 1** — Take version 7 of `you-can-choose` rather than whichever one it would give me.

## Category 2: Answering With Your Own Judgement (7–16)

7. **Turn 1** — Take the `team-retro` survey.
   **Turn 2** — Take it.
8. **Turn 1** — Take the city budget survey `city-budget`.
   **Turn 2** — Take it, funding what you would fund first.
9. **Turn 1** — Take the `school` survey.
   **Turn 2** — Take it, choosing what would do the most good for students.
10. **Turn 1** — Take the feature survey `product-features`.
    **Turn 2** — Take it, choosing what you would build first.
11. **Turn 1** — Take `team-retro`.
    **Turn 2** — Take it, recording only the single idea that matters most.
12. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it as an engineer who has to maintain the thing.
13. **Turn 1** — Take `school`.
    **Turn 2** — Take it the way a teacher would.
14. **Turn 1** — Take the retro survey `team-retro`.
    **Turn 2** — Take it, choosing the ideas that address causes rather than symptoms.
15. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it as if the budget only stretched to one of them.
16. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it for me: I pick the shade trees along the bus routes, and extending library hours into the evening.

## Category 3: Ranking What You Chose (17–24)

17. **Turn 1** — Take `team-retro`.
    **Turn 2** — Take it, with the one you would do this week first.
18. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it, most urgent first.
19. **Turn 1** — Take the feature survey `product-features`.
    **Turn 2** — Take it, ordered by how many users each would help.
20. **Turn 1** — Take `school`.
    **Turn 2** — Take it, ranked by what a student would notice soonest.
21. **Turn 1** — Take `team-retro`.
    **Turn 2** — Take it, ranked by how much time each would save the team.
22. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it, and put the cheaper one last.
23. **Turn 1** — Take the survey `team-retro`.
    **Turn 2** — Take it for me: cutting the build time in half first, then the flaky tests, then smaller pull requests.
24. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it for me, in this order: search across everything, not just the current page; then export to CSV and PDF; then a dark theme that respects the system setting.

## Category 4: Contributing an Idea of Your Own (25–34)

25. **Turn 1** — Take the retro survey `team-retro`.
    **Turn 2** — Take it, and add an idea of your own that the list is missing.
26. **Turn 1** — Take the city budget survey `city-budget`.
    **Turn 2** — Take it, and contribute something the council has clearly not thought of.
27. **Turn 1** — Take `school`.
    **Turn 2** — Take it, and add one idea of your own that no one on the list proposed.
28. **Turn 1** — Take the feature survey `product-features`.
    **Turn 2** — Take it, plus a feature you would want that is not offered.
29. **Turn 1** — Take `team-retro`.
    **Turn 2** — Take it, and add your own idea about how the team works rather than what it builds.
30. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it, with a contribution that would cost almost nothing.
31. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it, and add an idea aimed at people who use the product every day.
32. **Turn 1** — Take the school survey `school`.
    **Turn 2** — Take it, and add one idea of your own about what happens outside the classroom.
33. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it for me: offline mode and undo, plus an idea of my own — let me pin the three views I actually use.
34. **Turn 1** — Take `school`.
    **Turn 2** — Take it for me: air conditioning in every classroom, plus one of mine — a hot lunch children will actually eat.

## Category 5: A New Idea and Nothing Chosen (35–40)

35. **Turn 1** — Take the `city-budget` survey.
    **Turn 2** — None of these is what the neighbourhood needs. Take it choosing nothing, and record my own idea instead.
36. **Turn 1** — Take `school`.
    **Turn 2** — Take it without picking anything from the list — just the one thing you would do instead.
37. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it, deciding none of it is the right priority, and record only your own idea.
38. **Turn 1** — Take the school survey `school`.
    **Turn 2** — Take it with no selection and a single contribution.
39. **Turn 1** — Take `school`.
    **Turn 2** — Take it for me, without picking from the list. Just my idea: pay teaching assistants a living wage.
40. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it for me: nothing from the list, and one idea of mine — a late bus home on weekends.

## Category 6: Answering Within the Survey's Bounds (41–46)

41. **Turn 1** — Take `team-retro`.
    **Turn 2** — Take it, choosing as many as it allows.
42. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it, using every choice it gives me.
43. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it with the fewest choices it will accept.
44. **Turn 1** — Take `school`.
    **Turn 2** — Take it, picking the one that would help most and leaving it there.
45. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it recording whatever you actually think, even if that is a single idea plus one of your own.
46. **Turn 1** — Take `school`.
    **Turn 2** — Take it for me: free breakfast for every student, smaller class sizes in the early grades, and air conditioning in every classroom.

## Category 7: Answering From a Particular Point of View (47–50)

47. **Turn 1** — Take the school survey `school`.
    **Turn 2** — Take it the way a parent of a five-year-old would, and add the idea they would add.
48. **Turn 1** — Take `city-budget`.
    **Turn 2** — Take it as someone who does not own a car.
49. **Turn 1** — Take the retro survey `team-retro`.
    **Turn 2** — Take it as the person who carries the pager, and contribute an idea from that experience.
50. **Turn 1** — Take `product-features`.
    **Turn 2** — Take it as a customer who has been asking for the same thing for two years.
