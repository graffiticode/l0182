// SPDX-License-Identifier: MIT
import { createApp } from "./app.js";
import { mocking } from "./survey.js";

const port = process.env.PORT || "50182";
const authUrl = process.env.AUTH_URL || "https://auth.graffiticode.org";

const app = createApp({ authUrl });
app.listen(Number(port), () => {
  console.log(`L0182 language server listening on ${port} (authUrl ${authUrl})`);
  if (mocking()) {
    // Loud on purpose. A deploy that merely forgot the variable would otherwise serve invented
    // rankings that look real, and nothing downstream would say so.
    console.warn(
      "WARNING: no MYSTICWONK_API_URL — /survey/* is serving MOCK data. " +
        "Rankings and idea pools are fabricated and held in memory; not for real participants. " +
        "Run with --max-instances 1, because a second instance has its own pool.",
    );
  }
});

process.on("uncaughtException", (err) => {
  console.log(`ERROR uncaught exception: ${(err as Error).stack}`);
});
