// SPDX-License-Identifier: MIT
/* Copyright (c) 2026, ARTCOMPILER INC */
//
// L0182 inherits L0000: its Checker/Transformer extend L0000's. Attribute handlers are
// GENERATED from `attributeFields` and `configFields` — never hand-write one. Only containers
// (ITEMS, the item kinds) and PROG are written out, because each has a second argument role or
// an assembly step the tables cannot express. Unhandled tags fall through to L0000's handlers.
import {
  Checker as BaseChecker,
  Transformer as BaseTransformer,
  Compiler,
} from "@graffiticode/l0000";

import {
  ITEM_KINDS,
  attributeFields,
  configFields,
  checkValue,
  toPlainObject,
  wordOf,
} from "./attributes.js";
import { buildActivity, resolveConfig } from "./activity.js";
import { buildItem, validateSequence } from "./items.js";

/* ------------------------------------------------------------------ Checker */

export class Checker extends BaseChecker {
  [key: string]: any;
}

const checkNothing = function (this: any, node: any, options: any, resume: any) {
  resume([], node);
};
const checkChild = function (this: any, node: any, options: any, resume: any) {
  this.visit(node.elts[0], options, (e0: any) => resume(([] as any[]).concat(e0 || []), node));
};
const checkBoth = function (this: any, node: any, options: any, resume: any) {
  this.visit(node.elts[0], options, (e0: any) => {
    this.visit(node.elts[1], options, (e1: any) =>
      resume(([] as any[]).concat(e0 || [], e1 || []), node),
    );
  });
};

// The Checker only walks the tree. Value validation lives in the Transformer — `Checker.LIST`
// visits just `elts[0]`, so a rule written here would fire on the first element of a list and
// nowhere else, which in a list-based style is almost nowhere.
for (const [name, meta] of Object.entries(attributeFields)) {
  Checker.prototype[name] = meta.flag ? checkNothing : checkChild;
}
// A config word is arity 2, and `elts[1]` is the rest of the chain — a method that walked only
// `elts[0]` would silently drop every error below it.
for (const name of Object.keys(configFields)) {
  Checker.prototype[name] = checkBoth;
}
for (const kind of ITEM_KINDS) {
  Checker.prototype[kind.toUpperCase()] = checkChild;
}
Checker.prototype.ITEMS = checkBoth;

/* -------------------------------------------------------------- Transformer */

export class Transformer extends BaseTransformer {
  [key: string]: any;
}

/** Item-level attributes: evaluate to a single-key record; whatever encloses them merges. */
for (const [name, meta] of Object.entries(attributeFields)) {
  if (meta.flag) {
    // Arity 0: nothing to visit, presence is the value.
    Transformer.prototype[name] = function (node: any, options: any, resume: any) {
      resume([], { [meta.field]: true });
    };
    continue;
  }
  Transformer.prototype[name] = function (this: any, node: any, options: any, resume: any) {
    this.visit(node.elts[0], options, (e0: any, v0: any) => {
      const err = ([] as any[]).concat(e0 || []);
      const raw = toPlainObject(v0);
      const typeError = checkValue(name, meta, raw);
      if (typeError) {
        resume(err.concat(typeError), {});
        return;
      }
      resume(err, { [meta.field]: raw });
    });
  };
}

/**
 * Activity-level attributes: arity 2, chaining.
 *
 * Takes its value AND the rest of the chain, and returns the chain's record with its own key
 * added — L0166's shape. That is what lets `items [...] title "…" navigation "linear" {}`
 * build a configuration record without brackets, terminating in the record literal.
 */
for (const [name, meta] of Object.entries(configFields)) {
  Transformer.prototype[name] = function (this: any, node: any, options: any, resume: any) {
    this.visit(node.elts[0], options, (e0: any, v0: any) => {
      this.visit(node.elts[1], options, (e1: any, v1: any) => {
        const err = ([] as any[]).concat(e0 || [], e1 || []);
        const raw = toPlainObject(v0);
        const typeError = checkValue(name, meta, raw);
        if (typeError) {
          resume(err.concat(typeError), {});
          return;
        }
        const rest = toPlainObject(v1);
        if (rest !== null && typeof rest === "object" && !Array.isArray(rest)) {
          if (Object.prototype.hasOwnProperty.call(rest, meta.field)) {
            resume(
              err.concat(`${wordOf(name)}: is given twice. Each activity setting may appear once.`),
              {},
            );
            return;
          }
          resume(err, { ...rest, [meta.field]: raw });
          return;
        }
        // The chain must terminate in a record — `{}` when there is nothing more to say.
        resume(
          err.concat(
            `${wordOf(name)}: the activity's settings must end in a record, e.g. ` +
              `items [ … ] ${wordOf(name)} … {}.`,
          ),
          {},
        );
      });
    });
  };
}

/** Each item kind: an attribute list in, one item out. */
for (const kind of ITEM_KINDS) {
  Transformer.prototype[kind.toUpperCase()] = function (
    this: any,
    node: any,
    options: any,
    resume: any,
  ) {
    this.visit(node.elts[0], options, (e0: any, v0: any) => {
      const err = ([] as any[]).concat(e0 || []);
      try {
        resume(err, buildItem(kind, toPlainObject(v0), kind));
      } catch (e: any) {
        resume(err.concat(String((e && e.message) || e)), {});
      }
    });
  };
}

/**
 * The activity: a member list of items plus its own configuration record.
 *
 * Its elements are homogeneous children rather than named properties, so nothing merges them
 * together; each was already assembled by its own kind's handler.
 */
Transformer.prototype.ITEMS = function (this: any, node: any, options: any, resume: any) {
  this.visit(node.elts[0], options, (e0: any, v0: any) => {
    this.visit(node.elts[1], options, (e1: any, v1: any) => {
      const err = ([] as any[]).concat(e0 || [], e1 || []);
      const raw = toPlainObject(v0);
      if (!Array.isArray(raw)) {
        resume(
          err.concat(
            "items: expected a list of items, e.g. items [ select [sample 10 max-choices 5] ] {}.",
          ),
          {},
        );
        return;
      }
      const config = toPlainObject(v1);
      if (config === null || typeof config !== "object" || Array.isArray(config)) {
        resume(
          err.concat(
            "items: needs the activity's settings after the list, ending in a record — " +
              'e.g. items [ … ] title "…" {}. Write `{}` when there are none.',
          ),
          {},
        );
        return;
      }
      const bad = raw.findIndex(
        (i: any) => i === null || typeof i !== "object" || Array.isArray(i) || !i.type,
      );
      if (bad >= 0) {
        resume(
          err.concat(
            `items: entry ${bad + 1} is not an item. Each entry must be one of: ` +
              `${ITEM_KINDS.join(", ")}, e.g. select [sample 10 max-choices 5].`,
          ),
          {},
        );
        return;
      }
      try {
        const resolved = resolveConfig(config);
        validateSequence(raw, resolved.navigation);
        resume(err, buildActivity(raw, config));
      } catch (e: any) {
        resume(err.concat(String((e && e.message) || e)), {});
      }
    });
  });
};

/**
 * The program's value is its last expression.
 *
 * `data` is spread FIRST so the fresh compile wins. It carries the participant's response, but
 * after one round trip it also carries the previous compile's own `activity` (the View merges a
 * compile result back into the model), and letting that shadow the newly compiled one would
 * render a stale activity forever. L0179 spreads the other way round on purpose — its learner
 * edits live inside the compiled structure and must survive — but here a response is a separate
 * key the compiler never emits, and needs no such protection.
 */
Transformer.prototype.PROG = function (this: any, node: any, options: any, resume: any) {
  this.visit(node.elts[0], options, (e0: any, v0: any) => {
    const data = options?.data || {};
    const val = v0.pop();
    const isObject = typeof val === "object" && val !== null && !Array.isArray(val);
    resume(e0, isObject ? { ...data, ...val } : val);
  });
};

export const compiler = new Compiler({
  langID: "0182",
  version: "v0.0.1",
  Checker,
  Transformer,
});
