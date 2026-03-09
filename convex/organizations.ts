import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { deleteBasketballGamePlayerStatsByGame } from "./lib/basketballGamePlayerStats";
import { requireSuperAdmin } from "./lib/permissions";

const organizationValidator = v.object({
  _id: v.id("organizations"),
  _creationTime: v.number(),
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.string(),
  imageUrl: v.optional(v.string()),
});

/**
 * Get organization by slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * Get organization by ID.
 */
export const getById = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Get organization by Clerk organization ID.
 */
export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
  },
});

/**
 * List all organizations (SuperAdmin only).
 */
export const listAll = query({
  args: {},
  returns: v.array(organizationValidator),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("organizations").order("desc").collect();
  },
});

/**
 * Create organization from Clerk webhook (internal).
 */
export const createFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    // Check if organization already exists
    const existing = await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Check slug uniqueness
    const existingBySlug = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingBySlug) {
      throw new Error(`Organization with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("organizations", {
      clerkOrgId: args.clerkOrgId,
      name: args.name,
      slug: args.slug,
      imageUrl: args.imageUrl,
    });
  },
});

/**
 * Update organization from Clerk webhook (internal).
 */
export const updateFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!organization) {
      console.error(
        `Organization not found for clerkOrgId: ${args.clerkOrgId}`,
      );
      return null;
    }

    // Check slug uniqueness if changing
    if (args.slug !== organization.slug) {
      const existingBySlug = await ctx.db
        .query("organizations")
        .withIndex("bySlug", (q) => q.eq("slug", args.slug))
        .unique();

      if (existingBySlug && existingBySlug._id !== organization._id) {
        console.error(
          `Cannot update organization: slug "${args.slug}" already exists`,
        );
        return null;
      }
    }

    await ctx.db.patch(organization._id, {
      name: args.name,
      slug: args.slug,
      imageUrl: args.imageUrl,
    });

    return null;
  },
});

/**
 * Delete organization from Clerk webhook (internal).
 * Cascades deletion to all related entities.
 */
export const deleteFromClerk = internalMutation({
  args: { clerkOrgId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("byClerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!organization) {
      return null;
    }

    // Get all clubs for this organization
    const clubs = await ctx.db
      .query("clubs")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    // Get all games for this organization
    const games = await ctx.db
      .query("games")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    // 1. Delete basketball game player stats for all games
    for (const game of games) {
      await deleteBasketballGamePlayerStatsByGame(ctx, game._id);
    }

    // 2. Delete all games
    for (const game of games) {
      await ctx.db.delete(game._id);
    }

    // 3. Delete players, staff, and categories for each club
    for (const club of clubs) {
      // Delete players and their photos
      const players = await ctx.db
        .query("players")
        .withIndex("byClub", (q) => q.eq("clubId", club._id))
        .collect();
      for (const player of players) {
        if (player.photoStorageId) {
          await ctx.storage.delete(player.photoStorageId);
        }
        await ctx.db.delete(player._id);
      }

      // Delete staff
      const staffMembers = await ctx.db
        .query("staff")
        .withIndex("byClub", (q) => q.eq("clubId", club._id))
        .collect();
      for (const staff of staffMembers) {
        await ctx.db.delete(staff._id);
      }

      // Delete categories
      const categories = await ctx.db
        .query("categories")
        .withIndex("byClub", (q) => q.eq("clubId", club._id))
        .collect();
      for (const category of categories) {
        await ctx.db.delete(category._id);
      }
    }

    // 4. Delete clubs and their logos
    for (const club of clubs) {
      if (club.logoStorageId) {
        await ctx.storage.delete(club.logoStorageId);
      }
      await ctx.db.delete(club._id);
    }

    // 5. Delete conferences
    const conferences = await ctx.db
      .query("conferences")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();
    for (const conference of conferences) {
      await ctx.db.delete(conference._id);
    }

    // 6. Delete league settings
    const leagueSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();
    if (leagueSettings) {
      await ctx.db.delete(leagueSettings._id);
    }

    // 7. Delete organization memberships
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // 8. Finally, delete the organization
    await ctx.db.delete(organization._id);

    return null;
  },
});
