// SPDX-License-Identifier: MIT
/**
 * The survey proxy — the one place both clients meet.
 *
 * A human in the rendered form and an AI agent driving the MCP tools call the SAME three
 * endpoints, so "agent vs human is transparent" holds at the transport layer rather than by
 * convention: one sampler, one pool, one code path. The only difference between the two is
 * the `actor` this file stamps on the participation.
 *
 * Everything about the pool — which ideas exist, which ten this participant is shown, how the
 * ranking is computed — belongs to the collective-intelligence service. L0182 declares the
 * parameters and forwards; it does NOT implement any of it. The service credential lives here
 * and never reaches a browser or an agent.
 *
 * With no `MYSTICWONK_API_URL` configured this falls back to `mock-service.ts`, so the flow
 * works end to end with no credentials. That fallback is loud on purpose — a startup warning, a
 * `mock: true` on every frame, and a badge in the player — because a deploy that merely FORGOT
 * the variable would otherwise serve invented rankings that look real. A URL that is set but
 * unreachable still fails; the mock catches absence, never misconfiguration.
 */
import * as mock from "./mock-service.js";
import type { ItemRef } from "./mock-service.js";

export type ActorClass = "human" | "agent";

export interface Actor {
  class: ActorClass;
  via: "form" | "mcp";
  host?: string;
}

export interface Idea {
  id: string;
  text: string;
}

export interface Frame {
  participation: string;
  item: number;
  /** Present and true when this came from the built-in mock rather than a real service. */
  mock?: boolean;
  ideas?: Idea[];
  selected?: Idea[];
  results?: Array<Idea & { score?: number }>;
  participants?: number;
}

export type Answer =
  | { selected: string[] }
  | { ranked: string[] }
  | { contribution: string }
  | Record<string, never>;

export class SurveyError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/** No service configured means the mock stands in. Read per call so tests can toggle it. */
export const mocking = (): boolean => !process.env.MYSTICWONK_API_URL;

const serviceUrl = (): string => (process.env.MYSTICWONK_API_URL || "").replace(/\/$/, "");

async function call(path: string, body: unknown): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Server-held. A browser or an agent never sees it, which is the reason this proxy exists
  // rather than the clients calling the service directly.
  const key = process.env.MYSTICWONK_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  // Resolved OUTSIDE the try: a missing configuration is a 503 about this deployment, and
  // wrapping it in the transport catch reported it as "the survey service did not answer",
  // which is both the wrong status and a misleading thing to tell an operator.
  const url = `${serviceUrl()}${path}`;

  let resp: globalThis.Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new SurveyError(`the survey service did not answer: ${err?.message ?? err}`);
  }
  const text = await resp.text();
  let out: any = null;
  try {
    out = text ? JSON.parse(text) : null;
  } catch {
    throw new SurveyError(`the survey service returned something that is not JSON (${resp.status})`);
  }
  if (!resp.ok) {
    throw new SurveyError(out?.error?.message || out?.message || `survey service error ${resp.status}`);
  }
  return out;
}

/**
 * Refuse a class the activity does not accept.
 *
 * `participants` is authored, and this is where it bites. The class is decided from the route
 * the request arrived on — never read off the request body — because a caller able to name its
 * own class could enter a human-only session by asserting it was human, and a later
 * human-vs-agent comparison would be quietly wrong with no way to tell.
 */
export function assertAccepted(actor: Actor, participants?: string[]): void {
  if (!participants || !participants.length) return;
  if (participants.includes(actor.class)) return;
  throw new SurveyError(
    `this survey accepts ${participants.join(" and ")} participants, and this request is ${actor.class}.`,
    403,
  );
}

export interface OpenArgs {
  session?: string;
  participation?: string;
  participants?: string[];
  actor: Actor;
  /**
   * The activity's items, in order.
   *
   * The proxy never sees the activity — it gets a session, a participation and an answer — so a
   * backend that does not already know the session has no way to bound the cursor or size the
   * sample. Both clients hold the compiled activity, so they pass it; the real service knows all
   * of this from the session and ignores the field.
   */
  items?: ItemRef[];
}

/** Start a participation, or resume the one the token names. */
export async function open({ session, participation, participants, actor, items }: OpenArgs): Promise<Frame> {
  assertAccepted(actor, participants);
  if (mocking()) return mock.open({ session, participation, actor, items });
  return (await call("/survey/participations", { session, participation, actor })) as Frame;
}

export interface AnswerArgs extends OpenArgs {
  participation: string;
  /**
   * The item being answered.
   *
   * Optional: the service already knows where a participation is, so a client that is not
   * tracking a cursor (the MCP tools are stateless between calls) simply omits it. When it IS
   * sent — the form always knows — the service can reject a mismatch, which is what catches a
   * double submit answering the wrong item.
   */
  item?: number;
  answer: Answer;
}

/** Submit one item's answer and advance. */
export async function answer({
  session,
  participation,
  participants,
  actor,
  item,
  items,
  answer: given,
}: AnswerArgs): Promise<Frame> {
  assertAccepted(actor, participants);
  if (!participation) {
    throw new SurveyError("no participation: call /survey/open before answering.", 400);
  }
  if (item !== undefined && (typeof item !== "number" || item < 0)) {
    throw new SurveyError("`item`, when given, must be the id of the item being answered.", 400);
  }
  if (mocking()) return mock.answer({ session, participation, actor, item, items, answer: given });
  return (await call(`/survey/participations/${encodeURIComponent(participation)}/answers`, {
    session,
    ...(item !== undefined ? { item } : {}),
    answer: given,
    actor,
  })) as Frame;
}

export interface ResultsArgs {
  session?: string;
  participation?: string;
  audience?: string;
  limit?: number;
}

/** The group's current ranking, over the population the activity's `audience` names. */
export async function results({ session, participation, audience, limit }: ResultsArgs): Promise<Frame> {
  if (mocking()) return mock.results({ session, participation, audience, limit });
  return (await call("/survey/results", {
    session,
    participation,
    audience: audience || "all",
    limit: limit || 10,
  })) as Frame;
}
