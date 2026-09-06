// SPDX-License-Identifier: MIT
// @graffiticode/l0182-view — L0182's survey player, plus the shared View it is injected into
// (re-exported from the base language's view package).
export { Form, KINDS, knownItems } from "./components/form";
export type { ItemProps, ItemKind } from "./components/form";
export { reduce } from "./reduce";
export { openSurvey, answerSurvey } from "./lib/service";
export type { Idea, RankedIdea, Frame, Answer } from "./lib/service";
export { View } from "@graffiticode/l0000-view";
export type { FormProps, FormComponent, CompileError } from "@graffiticode/l0000-view";
