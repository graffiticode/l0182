// SPDX-License-Identifier: MIT
/**
 * L0182's extra reducer cases.
 *
 * `View` consults this before its own handling and falls through when it returns `undefined`.
 *
 * Navigation gets its own action because moving between items is not an answer. The shared
 * reducer recompiles on `update` and `response`, and a compile round trip per page turn would
 * be both slow and wrong: `submission "individual"` means an item submits when it is ANSWERED,
 * which is one POST per answered item, not one per screen. `navigate` merges and stops there —
 * the same shape as the built-in `focus` action.
 *
 * The cursor lives in the model rather than being derived because `PROG` recompiles on every
 * response: anything derived would move under the participant as they answer.
 */
import type { LanguageReducer } from "@graffiticode/l0000-view";

export const reduce: LanguageReducer = (data: any, { type, args }) => {
  if (type !== "navigate") return undefined;
  if (!args || typeof args !== "object") return data;
  return { ...data, response: { ...(data?.response || {}), ...args } };
};
