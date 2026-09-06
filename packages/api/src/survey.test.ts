// SPDX-License-Identifier: MIT
/**
 * The proxy's gatekeeping.
 *
 * `assertAccepted` is the rule that makes `participants` mean anything, and the actor it is
 * handed is derived from the route rather than the request body — so this is also the test
 * that a caller cannot talk its way into a session it is not allowed in.
 */
import { describe, expect, it } from "vitest";
import { SurveyError, assertAccepted, open } from "./survey.js";
import type { Actor } from "./survey.js";

const human: Actor = { class: "human", via: "form" };
const agent: Actor = { class: "agent", via: "mcp", host: "claude" };

describe("assertAccepted", () => {
  it("accepts anyone when the activity says nothing", () => {
    expect(() => assertAccepted(agent, undefined)).not.toThrow();
    expect(() => assertAccepted(agent, [])).not.toThrow();
  });

  it("accepts a listed class", () => {
    expect(() => assertAccepted(human, ["human", "agent"])).not.toThrow();
    expect(() => assertAccepted(agent, ["human", "agent"])).not.toThrow();
  });

  it("refuses a class the activity does not accept, and says so", () => {
    try {
      assertAccepted(agent, ["human"]);
      throw new Error("expected a refusal");
    } catch (e: any) {
      expect(e).toBeInstanceOf(SurveyError);
      expect(e.status).toBe(403);
      expect(e.message).toContain("accepts human participants");
      expect(e.message).toContain("this request is agent");
    }
  });

  it("refuses a human from an agent-only session too", () => {
    expect(() => assertAccepted(human, ["agent"])).toThrow(/accepts agent participants/);
  });
});

describe("configuration", () => {
  it("falls back to the mock when no service is configured", async () => {
    const had = process.env.MYSTICWONK_API_URL;
    delete process.env.MYSTICWONK_API_URL;
    try {
      const frame = await open({ session: "cfg-1", actor: human, items: [{ id: 0, type: "select", sample: 4 }] });
      // The fallback is for ABSENCE, and it announces itself: a caller — and a reader of the
      // logs — must be able to tell fabricated rankings from real ones.
      expect(frame.mock).toBe(true);
      expect(frame.ideas?.length).toBe(4);
    } finally {
      if (had) process.env.MYSTICWONK_API_URL = had;
    }
  });

  it("still fails loudly when a service IS configured but unreachable", async () => {
    // The mock must catch absence, never misconfiguration. A typo'd URL that silently served
    // invented data would be the worst outcome of having a mock at all.
    const had = process.env.MYSTICWONK_API_URL;
    process.env.MYSTICWONK_API_URL = "http://127.0.0.1:9";
    try {
      await open({ session: "cfg-2", actor: human });
      throw new Error("expected a refusal");
    } catch (e: any) {
      expect(e).toBeInstanceOf(SurveyError);
      expect(e.message).toContain("did not answer");
    } finally {
      if (had) process.env.MYSTICWONK_API_URL = had;
      else delete process.env.MYSTICWONK_API_URL;
    }
  });
});
