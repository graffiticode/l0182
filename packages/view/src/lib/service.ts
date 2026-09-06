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

/** One item of the activity, as the backend needs to see it. */
export interface ItemRef {
  id: number;
  type: string;
  sample?: number;
}

/** What the server says the participant should be looking at now. */
export interface Frame {
  participation: string;
  /** The id of the item the participant is on. */
  item: number;
  /**
   * True when the backend is the built-in mock rather than a real service.
   *
   * Surfaced in the player as a badge. A deployment that merely forgot to configure a service
   * would otherwise show invented rankings that look exactly like real ones.
   */
  mock?: boolean;
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

/**
 * Start or resume a participation.
 *
 * `participants` is the authored gate and must be sent, or the server has nothing to enforce
 * and a survey restricted to one class would admit the other. `items` is the activity's
 * sequence: the proxy never sees the compiled activity, so a backend that does not already know
 * the session cannot bound the cursor or size the sample without being told.
 */
export const openSurvey = (args: {
  session?: string;
  participation?: string;
  participants?: string[];
  items?: ItemRef[];
}): Promise<Frame> => post("/survey/open", args);

/** Submit the current item's answer and advance. */
export const answerSurvey = (args: {
  session?: string;
  participation: string;
  participants?: string[];
  items?: ItemRef[];
  item: number;
  answer: Answer;
}): Promise<Frame> => post("/survey/answer", args);
