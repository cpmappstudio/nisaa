import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireOrgAdmin } from "./lib/permissions";
import { resolveOrganizationBySlug } from "./lib/organizationResolver";

// ============================================================================
// VALIDATORS
// ============================================================================

const conferenceValidator = v.object({
  _id: v.id("conferences"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  name: v.string(),
  divisions: v.optional(v.array(v.string())),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List conferences by league slug.
 */
export const listByLeague = query({
  args: { leagueSlug: v.string() },
  returns: v.array(conferenceValidator),
  handler: async (ctx, args) => {
    const org = await resolveOrganizationBySlug(ctx, args.leagueSlug);

    if (!org) {
      return [];
    }

    return await ctx.db
      .query("conferences")
      .withIndex("byOrganization", (q) => q.eq("organizationId", org._id))
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new conference.
 */
export const create = mutation({
  args: {
    leagueSlug: v.string(),
    name: v.string(),
    divisions: v.optional(v.array(v.string())),
  },
  returns: v.id("conferences"),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const existing = await ctx.db
      .query("conferences")
      .withIndex("byOrgAndName", (q) =>
        q.eq("organizationId", organization._id).eq("name", args.name),
      )
      .unique();

    if (existing) {
      throw new Error(`Conference "${args.name}" already exists`);
    }

    return await ctx.db.insert("conferences", {
      organizationId: organization._id,
      name: args.name,
      divisions: args.divisions,
    });
  },
});

/**
 * Update a conference.
 */
export const update = mutation({
  args: {
    conferenceId: v.id("conferences"),
    name: v.optional(v.string()),
    divisions: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conference = await ctx.db.get(args.conferenceId);
    if (!conference) {
      throw new Error("Conference not found");
    }

    const org = await ctx.db.get(conference.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await requireOrgAdmin(ctx, org.slug);

    const { conferenceId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(conferenceId, filteredUpdates);
    }

    return null;
  },
});

/**
 * Delete a conference.
 */
export const remove = mutation({
  args: { conferenceId: v.id("conferences") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conference = await ctx.db.get(args.conferenceId);
    if (!conference) {
      throw new Error("Conference not found");
    }

    const org = await ctx.db.get(conference.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await requireOrgAdmin(ctx, org.slug);

    await ctx.db.delete(args.conferenceId);

    return null;
  },
});
