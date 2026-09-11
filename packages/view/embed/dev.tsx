// SPDX-License-Identifier: MIT
/**
 * Dev-only fixture page: the renderer's states, side by side, with no API behind them.
 *
 * `index.html` mounts the shared View, which wants a task `id` and an API to fetch it from —
 * fine for the deployed /form, useless for looking at the component. This renders `Survey`
 * against fixed models instead, so every state that is awkward to reach by hand is one page
 * away. Vite builds only `index.html`, so this is not part of the embed bundle.
 *
 * Run: npm run -w packages/view dev, then open /dev.html
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { Survey } from "../src";
import "../src/index.css";

const ideas = [
  { id: "a3", text: "protect voting rights" },
  { id: "b7", text: "universal healthcare system" },
  { id: "c1", text: "affordable housing" },
  { id: "d9", text: "mitigate climate change" },
  { id: "e4", text: "clean air and water" },
];

const survey = {
  id: "you-can-choose",
  sessionId: "7gMeEzUYkHqm3PDRrI8i",
  instance: "you-can-choose-7",
  title: "You Can Choose",
  ideas,
  minChoices: 1,
  maxChoices: 3,
};

const CASES: Array<[string, any, any[]]> = [
  ["Awaiting a response", { survey }, []],
  [
    "A full response",
    { survey, response: { selection: ["c1", "a3", "e4"], idea: "make public transit free" } },
    [],
  ],
  [
    "A contributed idea and nothing chosen",
    { survey, response: { selection: [], idea: "ranked-choice voting" } },
    [],
  ],
  ["An id naming nothing in the set", { survey, response: { selection: ["c1", "gone"] } }, []],
  [
    "A compile error",
    {},
    [{ message: 'survey: needs `id`, the survey being taken, e.g. survey [id "you-can-choose"].' }],
  ],
  ["Nothing compiled", {}, []],
];

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <React.StrictMode>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
        {CASES.map(([label, data, errors]) => (
          <section key={label}>
            <h2
              style={{
                font: "600 12px system-ui",
                textTransform: "uppercase",
                color: "#71717a",
                margin: "24px 0 0",
              }}
            >
              {label}
            </h2>
            <div style={{ border: "1px solid #e4e4e7", borderRadius: 8 }}>
              <Survey state={{ data, errors, apply: () => {} }} />
            </div>
          </section>
        ))}
      </div>
    </React.StrictMode>,
  );
}
