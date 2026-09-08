<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

44 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering creating a survey from a named pool, the ideas and their ids, the bounds a
response must satisfy, recording a selection in priority order, and contributing a new idea.

Each numbered line is a prompt in the author's own voice. Prompts describe WHAT to build, never
how to write it: an author asks for a survey, not for a `survey [...]` program. Note that the
ideas themselves are never asked for — they are resolved from the survey's name at code
generation, so a prompt names the survey, not its contents.

## Category 1: Creating a Survey from a Named Pool (1–10)

1. Set up the 'you-can-choose' survey so I can record what I picked.
2. Create a survey record for our team-priorities pool.
3. I want to answer the neighbourhood-association survey — pull in its ideas.
4. Make me a survey from the 'product-feedback' pool, titled 'Product Feedback'.
5. Start a survey record for the campus-improvements pool.
6. Get the ideas for the 'parks-budget' survey so I can choose between them.
7. Create the workplace-policies survey with the title 'What Would You Change?'.
8. Set up a record for the meeting-overload brainstorm.
9. Pull in the 'climate-priorities' survey and give it a proper title.
10. Make a survey record for the new-product-name pool.

## Category 2: The Ideas and Their Ids (11–18)

11. Build the survey so each idea keeps the id the service gave it.
12. The pool returned ids along with the text — make sure those are preserved.
13. Create a survey whose ideas are just lines of text, with no ids of their own.
14. Set up the survey with these ten ideas from the pool, keeping their service ids.
15. Add a title above the ideas but leave the ideas themselves as they came back.
16. The set came back without ids — number them by position.
17. Make a survey with a mix: some ideas carry ids, some are plain text.
18. Set up the survey record and give it a short title for the group.

## Category 3: Bounds on a Response (19–26)

19. A survey where you may pick at most 5 of the ideas.
20. Let people choose exactly 3 — no more, no fewer.
21. Set the survey so at least one idea must be chosen.
22. Cap the selection at 4 out of the whole set.
23. A survey with no limit — any number of the ideas may be picked.
24. Require between 2 and 6 choices.
25. Allow picking nothing at all, up to a maximum of 5.
26. Limit the choice to the top 3 and require at least one.

## Category 4: Recording a Selection (27–36)

27. Record that I chose affordable housing, clean air and water, and voting rights, in that order.
28. My top choice is the healthcare idea, then climate, then transit.
29. Save my selection: the third idea first, then the first one.
30. I picked these five ideas — put them in the order I listed them.
31. Record my answer with just one idea chosen.
32. Reorder my selection so the housing idea comes first.
33. Add my choices to the survey, most important first.
34. Record a response that selects three of the ideas and ranks them.
35. Change my ranking — swap the first two.
36. Update the response to drop the last idea I selected.

## Category 5: Contributing a New Idea (37–44)

37. Add my own idea alongside my selection: make public transit free.
38. I want to contribute a suggestion that is not in the list.
39. Record just a new idea — I do not want to pick any of the existing ones.
40. Add 'lower prescription drug prices' as my contributed idea.
41. Save my three choices and my own suggestion together.
42. Replace the idea I contributed with a better wording of it.
43. Remove the new idea from my response but keep my selection.
44. Record my answer with both a ranked selection and one idea of my own.
