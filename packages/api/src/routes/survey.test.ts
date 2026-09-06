// SPDX-License-Identifier: MIT
/**
 * The actor a request is stamped with comes from HOW it arrived.
 *
 * A body field would be self-asserted: an agent could enter a human-only session by claiming
 * to be human, and a later human-vs-agent comparison would be wrong with nothing to reveal it.
 * These assert the derivation reads headers only.
 */
import { describe, expect, it } from "vitest";
import { actorOf } from "./survey.js";

const req = (headers: Record<string, string>, body: any = {}) =>
  ({ header: (h: string) => headers[h.toLowerCase()], body }) as any;

describe("actorOf", () => {
  it("calls a plain request human", () => {
    expect(actorOf(req({}))).toEqual({ class: "human", via: "form" });
  });

  it("calls an MCP request an agent, and records the host", () => {
    expect(
      actorOf(req({ "x-graffiticode-client": "mcp", "x-graffiticode-client-host": "claude" })),
    ).toEqual({ class: "agent", via: "mcp", host: "claude" });
  });

  it("is case-insensitive about the client header", () => {
    expect(actorOf(req({ "x-graffiticode-client": "MCP" })).class).toBe("agent");
  });

  it("ignores a class asserted in the body", () => {
    const spoofed = req({ "x-graffiticode-client": "mcp" }, { actor: { class: "human" } });
    expect(actorOf(spoofed).class).toBe("agent");
  });

  it("ignores an unknown client header rather than trusting it", () => {
    expect(actorOf(req({ "x-graffiticode-client": "something-else" })).class).toBe("human");
  });
});
