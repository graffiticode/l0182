// SPDX-License-Identifier: MIT
/**
 * The client for L0182's survey proxy.
 *
 * The proxy is served by this language's own api package, alongside the `/form` bundle this
 * code is loaded from, so the base URL is the page's own origin and there is nothing to
 * configure. The credential for the collective-intelligence service lives on that server and
 * never reaches the browser.
 *
 * The same three endpoints back the MCP tools, which is what makes agent and human
 * participation transparent: two clients, one code path, one sampler.
 */

export interface Idea {
  id: string;
  text: string;
}

export interface RankedIdea extends Idea {
  /** Percentage, as the results screen shows it. Absent when the activity hides scores. */
  score?: number;
}

/** What the server says the participant should be looking at now. */
export interface Frame {
  participation: string;
  /** The id of the item the participant is on. */
  item: number;
  /** For a `select` item: this participant's adaptive sample. */
  ideas?: Idea[];
  /** For a `rank` item: the ideas they selected, in their current order. */
  selected?: Idea[];
  /** For a `results` item. */
  results?: RankedIdea[];
  participants?: number;
}

export type Answer =
  | { selected: string[] }
  | { ranked: string[] }
  | { contribution: string }
  | Record<string, never>;

const base = (): string => {
  // Same origin as the /form bundle. A relative URL would also work, but naming it keeps the
  // dev harness (vite on another port) honest about where it is pointing.
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

async function post(path: string, body: unknown): Promise<Frame> {
  const resp = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await resp.json();
  if (!resp.ok) throw new Error(out?.error?.message || `${path} failed (${resp.status})`);
  return out as Frame;
}

/** Start or resume a participation. */
export const openSurvey = (args: {
  session?: string;
  participation?: string;
}): Promise<Frame> => post("/survey/open", args);

/** Submit the current item's answer and advance. */
export const answerSurvey = (args: {
  session?: string;
  participation: string;
  item: number;
  answer: Answer;
}): Promise<Frame> => post("/survey/answer", args);
