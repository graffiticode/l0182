// SPDX-License-Identifier: MIT
/**
 * The survey routes.
 *
 * Mounted after the public static middleware and alongside auth, per app.ts's ordering.
 *
 * `via` — and therefore `class` — comes from how the request arrived, not from its body. The
 * form bundle posts here directly; the MCP server posts with `X-Graffiticode-Client: mcp`. A
 * body field would be self-asserted and spoofable, and a wrong class silently corrupts every
 * later comparison between the two populations.
 */
import { Router } from "express";
import type { Request } from "express";
import { SurveyError, answer, open, results } from "../survey.js";
import type { Actor } from "../survey.js";

export function actorOf(req: Request): Actor {
  const via = String(req.header("x-graffiticode-client") || "").toLowerCase() === "mcp" ? "mcp" : "form";
  const host = req.header("x-graffiticode-client-host") || undefined;
  return via === "mcp" ? { class: "agent", via, ...(host ? { host } : {}) } : { class: "human", via };
}

const fail = (res: any, err: any) => {
  const status = err instanceof SurveyError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message: String(err?.message ?? err) } });
};

export default () => {
  const router = Router();

  router.post("/open", async (req, res) => {
    try {
      res.status(200).json(await open({ ...req.body, actor: actorOf(req) }));
    } catch (err) {
      fail(res, err);
    }
  });

  router.post("/answer", async (req, res) => {
    try {
      res.status(200).json(await answer({ ...req.body, actor: actorOf(req) }));
    } catch (err) {
      fail(res, err);
    }
  });

  // Read-only, so it is a GET and takes its arguments from the query string.
  router.get("/results", async (req, res) => {
    try {
      const { session, participation, audience, limit } = req.query;
      res.status(200).json(
        await results({
          session: session as string | undefined,
          participation: participation as string | undefined,
          audience: audience as string | undefined,
          limit: limit ? Number(limit) : undefined,
        }),
      );
    } catch (err) {
      fail(res, err);
    }
  });

  return router;
};
