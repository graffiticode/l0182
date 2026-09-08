<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# L0182 RAG Training Examples

44 example prompts for training a RAG model on L0182, the collective-intelligence survey
record — covering creating a survey from a dataset of ideas, the ideas and their ids, the bounds
a response must satisfy, recording a selection in priority order, and contributing a new idea.

Each numbered line is a prompt in the author's own voice. Prompts describe WHAT to build, never
how to write it: an author asks for a survey, not for a `survey [...]` program. The ideas are
given rather than invented, so a prompt either names the address they live at or supplies them —
never asks for them to be made up.

The addresses below are L0182's own sample dataset, the same twelve civic priorities in both
formats, so these prompts are runnable rather than illustrative:
`https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json` and `https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv`.

## Category 1: Creating a Survey from a Dataset (1–10)

1. Set up the 'you-can-choose' survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json so I can record what I picked.
2. Create a survey record called team-priorities that pulls its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json.
3. I want to answer the neighbourhood-association survey — read its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv.
4. Make me a survey named product-feedback and titled 'Product Feedback', reading its ideas from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json.
5. Start a survey record for campus-improvements from these ideas: better wifi in the library, longer lab hours, more bike racks, cheaper printing.
6. Get the ideas for the 'parks-budget' survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv so I can choose between them.
7. Create the workplace-policies survey titled 'What Would You Change?' from the list I just pasted.
8. Set up a record for the meeting-overload brainstorm using the ideas at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json.
9. Pull in the 'climate-priorities' survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json and give it a proper title.
10. Make a survey record for new-product-name, reading the suggestions from the CSV export at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv.

## Category 2: The Dataset and Its Ids (11–18)

11. Build the survey from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.json so each idea keeps the id the dataset gave it.
12. The CSV at https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv has an id column as well as the text — make sure those ids are preserved.
13. Create a survey from a JSON list of plain strings, with no ids of their own.
14. Set up the survey with these ten ideas I already have, keeping their service ids.
15. Add a title above the ideas but leave the ideas themselves as they came back.
16. The dataset came back without ids — number them by position.
17. Make a survey with a mix: some ideas carry ids, some are plain text.
18. Set up the survey record from https://raw.githubusercontent.com/graffiticode/l0182/main/packages/core/spec/ideas.csv and give it a short title for the group.

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
29. Save my selection by position: the third idea first, then the first one.
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
