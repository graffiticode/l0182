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
  it("reports a missing service as 503 about this deployment, not as a transport failure", async () => {
    const had = process.env.MYSTICWONK_API_URL;
    delete process.env.MYSTICWONK_API_URL;
    try {
      await open({ session: "s1", actor: human });
      throw new Error("expected a refusal");
    } catch (e: any) {
      expect(e).toBeInstanceOf(SurveyError);
      expect(e.status).toBe(503);
      expect(e.message).toContain("MYSTICWONK_API_URL");
      // The transport catch used to swallow this and relabel it "did not answer".
      expect(e.message).not.toContain("did not answer");
    } finally {
      if (had) process.env.MYSTICWONK_API_URL = had;
    }
  });
});
