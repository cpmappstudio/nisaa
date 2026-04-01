import { v } from "convex/values";
import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  deriveDivisionFromCategoryName,
  findLeagueAgeCategoryByAgeGroup,
  normalizeAgeGroup,
  normalizeDivision,
  normalizeSpaces,
} from "../lib/basketball/categories";
import { getClubLeagueCategoryConfig } from "./lib/categories/helpers";
import { requireClubAccess, requireClubAccessBySlug } from "./lib/permissions";

// ============================================================================
// VALIDATORS
// ============================================================================

const gender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const categoryStatus = v.union(v.literal("active"), v.literal("inactive"));

const categoryValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  clubId: v.id("clubs"),
  leagueCategoryId: v.optional(v.string()),
  name: v.string(),
  ageGroup: v.string(),
  gender: gender,
  status: categoryStatus,
});

const categoryWithPlayerCountValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  leagueCategoryId: v.optional(v.string()),
  name: v.string(),
  ageGroup: v.string(),
  gender: gender,
  status: categoryStatus,
  playerCount: v.number(),
});

async function findSemanticCategoryDuplicate(
  ctx: QueryCtx | MutationCtx,
  args: {
    clubId: Id<"clubs">;
    ageGroup: string;
    gender: "male" | "female" | "mixed";
    name: string;
    division?: string;
    excludeCategoryId?: Id<"categories">;
  },
) {
  const categories = await ctx.db
    .query("categories")
    .withIndex("byClub", (q) => q.eq("clubId", args.clubId))
    .collect();

  const targetAgeGroup = normalizeAgeGroup(args.ageGroup);
  const targetDivision = args.division
    ? normalizeDivision(args.division)
    : deriveDivisionFromCategoryName(args.name, args.ageGroup);

  return categories.find((category) => {
    if (
      args.excludeCategoryId &&
      String(category._id) === String(args.excludeCategoryId)
    ) {
      return false;
    }

    return (
      normalizeAgeGroup(category.ageGroup) === targetAgeGroup &&
      category.gender === args.gender &&
      deriveDivisionFromCategoryName(category.name, category.ageGroup) ===
        targetDivision
    );
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List categories by club slug.
 */
export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);

    return await ctx.db
      .query("categories")
      .withIndex("byClub", (q) => q.eq("clubId", club._id))
      .collect();
  },
});

/**
 * List categories by club slug with player count.
 */
export const listByClubSlugWithPlayerCount = query({
  args: { clubSlug: v.string() },
  returns: v.array(categoryWithPlayerCountValidator),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);

    const categories = await ctx.db
      .query("categories")
      .withIndex("byClub", (q) => q.eq("clubId", club._id))
      .collect();

    const result: Array<{
      _id: (typeof categories)[0]["_id"];
      _creationTime: number;
      leagueCategoryId?: string;
      name: string;
      ageGroup: string;
      gender: "male" | "female" | "mixed";
      status: "active" | "inactive";
      playerCount: number;
    }> = [];

    for (const category of categories) {
      const players = await ctx.db
        .query("players")
        .withIndex("byCategory", (q) => q.eq("categoryId", category._id))
        .collect();

      result.push({
        _id: category._id,
        _creationTime: category._creationTime,
        leagueCategoryId: category.leagueCategoryId,
        name: category.name,
        ageGroup: category.ageGroup,
        gender: category.gender,
        status: category.status,
        playerCount: players.length,
      });
    }

    return result;
  },
});

/**
 * Get a category by ID.
 */
export const getById = query({
  args: { categoryId: v.id("categories") },
  returns: v.union(categoryValidator, v.null()),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      return null;
    }

    await requireClubAccess(ctx, category.clubId);
    return category;
  },
});

/**
 * Check if clubs have a category with the specified ageGroup and gender.
 */
export const checkClubsHaveCategory = query({
  args: {
    clubIds: v.array(v.id("clubs")),
    ageGroup: v.string(),
    gender: gender,
  },
  returns: v.array(
    v.object({
      clubId: v.id("clubs"),
      clubName: v.string(),
      hasCategory: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.clubIds.map(async (clubId) => {
        const club = await ctx.db.get(clubId);
        if (!club) {
          return null;
        }

        const categories = await ctx.db
          .query("categories")
          .withIndex("byClub", (q) => q.eq("clubId", clubId))
          .collect();

        const hasCategory = categories.some(
          (cat) => cat.ageGroup === args.ageGroup && cat.gender === args.gender,
        );

        return { clubId, clubName: club.name, hasCategory };
      }),
    );

    return results.filter((r) => r !== null);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new category.
 */
export const create = mutation({
  args: {
    clubSlug: v.string(),
    name: v.string(),
    ageGroup: v.string(),
    gender: gender,
    division: v.optional(v.string()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);
    const { ageCategories } = await getClubLeagueCategoryConfig(ctx, club._id);

    const normalizedName = normalizeSpaces(args.name);
    const normalizedAgeGroup = normalizeSpaces(args.ageGroup);
    if (!normalizedName || !normalizedAgeGroup) {
      throw new Error("Category name and age group are required");
    }

    const existing = await findSemanticCategoryDuplicate(ctx, {
      clubId: club._id,
      ageGroup: normalizedAgeGroup,
      gender: args.gender,
      name: normalizedName,
      division: args.division,
    });

    if (existing) {
      throw new Error(
        "A category with the same age group, gender, and division already exists",
      );
    }

    const leagueCategory = findLeagueAgeCategoryByAgeGroup(
      ageCategories,
      normalizedAgeGroup,
    );

    return await ctx.db.insert("categories", {
      clubId: club._id,
      leagueCategoryId: leagueCategory?.id,
      name: normalizedName,
      ageGroup: normalizedAgeGroup,
      gender: args.gender,
      status: "active",
    });
  },
});

/**
 * Update a category.
 */
export const update = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    gender: v.optional(gender),
    status: v.optional(categoryStatus),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireClubAccess(ctx, category.clubId);
    const { ageCategories } = await getClubLeagueCategoryConfig(
      ctx,
      category.clubId,
    );

    const { categoryId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (typeof filteredUpdates.name === "string") {
      filteredUpdates.name = normalizeSpaces(filteredUpdates.name);
    }
    if (typeof filteredUpdates.ageGroup === "string") {
      filteredUpdates.ageGroup = normalizeSpaces(filteredUpdates.ageGroup);
    }

    const targetName =
      typeof filteredUpdates.name === "string"
        ? filteredUpdates.name
        : category.name;
    const targetAgeGroup =
      typeof filteredUpdates.ageGroup === "string"
        ? filteredUpdates.ageGroup
        : category.ageGroup;
    const targetGender =
      typeof filteredUpdates.gender === "string"
        ? (filteredUpdates.gender as "male" | "female" | "mixed")
        : category.gender;

    const existing = await findSemanticCategoryDuplicate(ctx, {
      clubId: category.clubId,
      ageGroup: targetAgeGroup,
      gender: targetGender,
      name: targetName,
      excludeCategoryId: categoryId,
    });

    if (existing) {
      throw new Error(
        "A category with the same age group, gender, and division already exists",
      );
    }

    const matchedLeagueCategory = findLeagueAgeCategoryByAgeGroup(
      ageCategories,
      targetAgeGroup,
    );
    if (matchedLeagueCategory?.id !== category.leagueCategoryId) {
      filteredUpdates.leagueCategoryId = matchedLeagueCategory?.id;
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(categoryId, filteredUpdates);
    }

    return null;
  },
});

/**
 * Delete a category.
 * Also deletes all players in the category.
 */
export const remove = mutation({
  args: { categoryId: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await requireClubAccess(ctx, category.clubId);

    // Delete all players in this category
    const players = await ctx.db
      .query("players")
      .withIndex("byCategory", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    // Delete staff assigned to this category
    const staff = await ctx.db
      .query("staff")
      .withIndex("byCategory", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const s of staff) {
      await ctx.db.delete(s._id);
    }

    // Delete the category
    await ctx.db.delete(args.categoryId);

    return null;
  },
});
