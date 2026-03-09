import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireOrgAdmin } from "./lib/permissions";
import { resolveOrganizationBySlug } from "./lib/organizationResolver";

// ============================================================================
// VALIDATORS
// ============================================================================

const clubStatus = v.union(
  v.literal("affiliated"),
  v.literal("invited"),
  v.literal("suspended"),
);

const clubValidator = v.object({
  _id: v.id("clubs"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  name: v.string(),
  slug: v.string(),
  nickname: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  logoUrl: v.optional(v.string()),
  colors: v.optional(v.array(v.string())),
  colorNames: v.optional(v.array(v.string())),
  status: clubStatus,
  delegateUserId: v.optional(v.id("users")),
});

const clubListItemValidator = v.object({
  _id: v.id("clubs"),
  name: v.string(),
  nickname: v.string(),
  logoUrl: v.optional(v.string()),
  headCoach: v.object({
    name: v.string(),
  }),
  status: clubStatus,
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all clubs for a league (organization).
 * Returns data formatted for the teams table.
 */
export const listByLeague = query({
  args: { orgSlug: v.string() },
  returns: v.array(clubListItemValidator),
  handler: async (ctx, args) => {
    const org = await resolveOrganizationBySlug(ctx, args.orgSlug);

    if (!org) {
      return [];
    }

    const clubs = await ctx.db
      .query("clubs")
      .withIndex("byOrganization", (q) => q.eq("organizationId", org._id))
      .collect();

    const headCoachAssignments = await Promise.all(
      clubs.map(async (club) => {
        const assignment = await ctx.db
          .query("staff")
          .withIndex("byClubAndRole", (q) =>
            q.eq("clubId", club._id).eq("role", "head_coach"),
          )
          .order("desc")
          .first();
        return [club._id, assignment] as const;
      }),
    );
    const headCoachAssignmentByClub = new Map(headCoachAssignments);

    const headCoachUserIds = [
      ...new Set(
        clubs
          .map((club) => {
            const assignment = headCoachAssignmentByClub.get(club._id);
            return assignment?.userId ?? club.delegateUserId;
          })
          .filter((userId): userId is Id<"users"> => Boolean(userId)),
      ),
    ];
    const headCoachUsers = await Promise.all(
      headCoachUserIds.map((userId) => ctx.db.get(userId)),
    );
    const headCoachUserMap = new Map(
      headCoachUsers
        .filter((user): user is NonNullable<typeof user> => Boolean(user))
        .map((user) => [user._id, user]),
    );

    const result: Array<{
      _id: Id<"clubs">;
      name: string;
      nickname: string;
      logoUrl?: string;
      headCoach: { name: string };
      status: "affiliated" | "invited" | "suspended";
    }> = [];

    for (const club of clubs) {
      let logoUrl: string | undefined;
      if (club.logoStorageId) {
        logoUrl = (await ctx.storage.getUrl(club.logoStorageId)) ?? undefined;
      }

      const headCoachAssignment = headCoachAssignmentByClub.get(club._id);
      const headCoachUserId =
        headCoachAssignment?.userId ?? club.delegateUserId;
      const headCoachUser = headCoachUserId
        ? headCoachUserMap.get(headCoachUserId)
        : undefined;
      const headCoachName = headCoachUser
        ? `${headCoachUser.firstName} ${headCoachUser.lastName}`.trim()
        : "";

      result.push({
        _id: club._id,
        name: club.name,
        nickname: club.nickname ?? "",
        logoUrl,
        headCoach: {
          name: headCoachName,
        },
        status: club.status,
      });
    }

    return result;
  },
});

/**
 * Get a club by its slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!club) {
      return null;
    }

    let logoUrl: string | undefined;
    if (club.logoStorageId) {
      logoUrl = (await ctx.storage.getUrl(club.logoStorageId)) ?? undefined;
    }

    return {
      ...club,
      logoUrl,
    };
  },
});

/**
 * Get a club by its ID.
 */
export const getById = query({
  args: { clubId: v.id("clubs") },
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx, args) => {
    const club = await ctx.db.get(args.clubId);

    if (!club) {
      return null;
    }

    let logoUrl: string | undefined;
    if (club.logoStorageId) {
      logoUrl = (await ctx.storage.getUrl(club.logoStorageId)) ?? undefined;
    }

    return {
      ...club,
      logoUrl,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new club with optional delegate.
 */
export const createWithDelegate = mutation({
  args: {
    name: v.string(),
    nickname: v.optional(v.string()),
    orgSlug: v.string(),
    status: clubStatus,
    logoStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.array(v.string())),
    colorNames: v.optional(v.array(v.string())),
    delegateEmail: v.optional(v.string()),
  },
  returns: v.id("clubs"),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.orgSlug);

    // Use nickname as slug if provided, otherwise generate from name
    const slug = args.nickname
      ? args.nickname
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "")
          .replace(/^-|-$/g, "")
      : args.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

    if (!slug) {
      throw new Error("A valid nickname/slug is required");
    }

    // Check slug uniqueness within organization
    const existing = await ctx.db
      .query("clubs")
      .withIndex("byOrgAndSlug", (q) =>
        q.eq("organizationId", organization._id).eq("slug", slug),
      )
      .unique();

    if (existing) {
      throw new Error(`Club with slug "${slug}" already exists in this league`);
    }

    // Find delegate by email if provided
    let delegateUserId: Id<"users"> | undefined;
    if (args.delegateEmail) {
      const delegateUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", args.delegateEmail!))
        .unique();

      if (delegateUser) {
        delegateUserId = delegateUser._id;
      }
    }

    const clubId = await ctx.db.insert("clubs", {
      organizationId: organization._id,
      name: args.name,
      slug,
      nickname: args.nickname,
      logoStorageId: args.logoStorageId,
      colors: args.colors,
      colorNames: args.colorNames,
      status: args.status,
      delegateUserId,
    });

    return clubId;
  },
});

/**
 * Update a club's information.
 */
export const update = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.optional(v.string()),
    nickname: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.array(v.string())),
    colorNames: v.optional(v.array(v.string())),
    status: v.optional(clubStatus),
    delegateUserId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const org = await ctx.db.get(club.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await requireOrgAdmin(ctx, org.slug);

    const { clubId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // Update slug if nickname changed (nickname is used as slug)
    if (
      filteredUpdates.nickname &&
      typeof filteredUpdates.nickname === "string"
    ) {
      const newSlug = filteredUpdates.nickname
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/^-|-$/g, "");

      if (newSlug) {
        // Check uniqueness
        const existing = await ctx.db
          .query("clubs")
          .withIndex("byOrgAndSlug", (q) =>
            q.eq("organizationId", club.organizationId).eq("slug", newSlug),
          )
          .unique();

        if (existing && existing._id !== clubId) {
          throw new Error(`Club with slug "${newSlug}" already exists`);
        }

        filteredUpdates.slug = newSlug;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(clubId, filteredUpdates);
    }

    return null;
  },
});

/**
 * Delete a club.
 */
export const remove = mutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const org = await ctx.db.get(club.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    await requireOrgAdmin(ctx, org.slug);

    // Delete related data
    const categories = await ctx.db
      .query("categories")
      .withIndex("byClub", (q) => q.eq("clubId", args.clubId))
      .collect();

    for (const category of categories) {
      // Delete players in this category
      const players = await ctx.db
        .query("players")
        .withIndex("byCategory", (q) => q.eq("categoryId", category._id))
        .collect();
      for (const player of players) {
        await ctx.db.delete(player._id);
      }
      await ctx.db.delete(category._id);
    }

    // Delete staff
    const staffMembers = await ctx.db
      .query("staff")
      .withIndex("byClub", (q) => q.eq("clubId", args.clubId))
      .collect();
    for (const staff of staffMembers) {
      await ctx.db.delete(staff._id);
    }

    // Delete the club
    await ctx.db.delete(args.clubId);

    return null;
  },
});
