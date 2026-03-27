/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categories from "../categories.js";
import type * as clerk from "../clerk.js";
import type * as clubs from "../clubs.js";
import type * as conferences from "../conferences.js";
import type * as files from "../files.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as leagueSettings from "../leagueSettings.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_auth_types from "../lib/auth_types.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_tenancy from "../lib/tenancy.js";
import type * as lib_validators from "../lib/validators.js";
import type * as members from "../members.js";
import type * as organizations from "../organizations.js";
import type * as players from "../players.js";
import type * as rosterImports from "../rosterImports.js";
import type * as staff from "../staff.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  clerk: typeof clerk;
  clubs: typeof clubs;
  conferences: typeof conferences;
  files: typeof files;
  games: typeof games;
  http: typeof http;
  leagueSettings: typeof leagueSettings;
  "lib/auth": typeof lib_auth;
  "lib/auth_types": typeof lib_auth_types;
  "lib/permissions": typeof lib_permissions;
  "lib/tenancy": typeof lib_tenancy;
  "lib/validators": typeof lib_validators;
  members: typeof members;
  organizations: typeof organizations;
  players: typeof players;
  rosterImports: typeof rosterImports;
  staff: typeof staff;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
