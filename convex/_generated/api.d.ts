/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as admin from "../admin.js";
import type * as closeLoop from "../closeLoop.js";
import type * as committee from "../committee.js";
import type * as hydra from "../hydra.js";
import type * as lib_callScript from "../lib/callScript.js";
import type * as lib_fiber from "../lib/fiber.js";
import type * as lib_orangeslice from "../lib/orangeslice.js";
import type * as lib_seed from "../lib/seed.js";
import type * as mutations from "../mutations.js";
import type * as outreach from "../outreach.js";
import type * as queries from "../queries.js";
import type * as rethread from "../rethread.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  admin: typeof admin;
  closeLoop: typeof closeLoop;
  committee: typeof committee;
  hydra: typeof hydra;
  "lib/callScript": typeof lib_callScript;
  "lib/fiber": typeof lib_fiber;
  "lib/orangeslice": typeof lib_orangeslice;
  "lib/seed": typeof lib_seed;
  mutations: typeof mutations;
  outreach: typeof outreach;
  queries: typeof queries;
  rethread: typeof rethread;
  voice: typeof voice;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
