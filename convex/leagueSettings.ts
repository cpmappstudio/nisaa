import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  normalizeAgeGroup,
  normalizeSpaces,
} from "../lib/basketball/categories";
import { syncClubCategoriesForLeagueCategoryRename } from "./lib/categories/helpers";
import { requireOrgAccess, requireOrgAdmin } from "./lib/permissions";

// ============================================================================
// VALIDATORS
// ============================================================================

const gender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const sportType = v.union(v.literal("basketball"), v.literal("soccer"));

const ageCategoryValidator = v.object({
  id: v.string(),
  name: v.string(),
  minAge: v.number(),
  maxAge: v.number(),
});

const positionValidator = v.object({
  id: v.string(),
  name: v.string(),
  abbreviation: v.string(),
});

const seasonValidator = v.object({
  id: v.string(),
  name: v.string(),
  startDate: v.string(),
  endDate: v.string(),
});

const horizontalDivisionsValidator = v.object({
  enabled: v.boolean(),
  type: v.union(
    v.literal("alphabetic"),
    v.literal("greek"),
    v.literal("numeric"),
  ),
});

const teamConfigValidator = v.object({
  sportType: sportType,
  ageCategories: v.array(ageCategoryValidator),
  positions: v.array(positionValidator),
  enabledGenders: v.array(gender),
  horizontalDivisions: v.optional(horizontalDivisionsValidator),
});

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get team configuration for a league.
 * Returns the settings needed for creating teams, categories, and games.
 */
export const getTeamConfig = query({
  args: { leagueSlug: v.string() },
  returns: v.union(teamConfigValidator, v.null()),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!org) {
      return null;
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) => q.eq("organizationId", org._id))
      .unique();

    if (!settings) {
      // Return default configuration
      return {
        sportType: "basketball" as const,
        ageCategories: [],
        positions: [],
        enabledGenders: ["male", "female"] as Array<
          "male" | "female" | "mixed"
        >,
        horizontalDivisions: undefined,
      };
    }

    return {
      sportType: settings.sportType,
      ageCategories: settings.ageCategories,
      positions: settings.positions ?? [],
      enabledGenders: settings.enabledGenders,
      horizontalDivisions: settings.horizontalDivisions,
    };
  },
});

/**
 * Get full league settings.
 */
export const getByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("leagueSettings"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      sportType: sportType,
      ageCategories: v.array(ageCategoryValidator),
      positions: v.optional(v.array(positionValidator)),
      enabledGenders: v.array(gender),
      seasons: v.optional(v.array(seasonValidator)),
      horizontalDivisions: v.optional(horizontalDivisionsValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!org) {
      return null;
    }

    return await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) => q.eq("organizationId", org._id))
      .unique();
  },
});

/**
 * List all seasons for a league.
 */
export const listSeasons = query({
  args: { leagueSlug: v.string() },
  returns: v.array(seasonValidator),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAccess(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    const seasons = settings?.seasons ?? [];
    return [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
});

/**
 * List active seasons for a league.
 * A season is active when today is within its date range.
 */
export const listActiveSeasons = query({
  args: { leagueSlug: v.string() },
  returns: v.array(seasonValidator),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAccess(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings?.seasons?.length) {
      return [];
    }

    const today = getTodayDateString();
    return settings.seasons
      .filter((season) => season.startDate <= today && season.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update league settings.
 */
export const upsert = mutation({
  args: {
    leagueSlug: v.string(),
    sportType: sportType,
    ageCategories: v.array(ageCategoryValidator),
    positions: v.array(positionValidator),
    enabledGenders: v.array(gender),
    horizontalDivisions: v.optional(horizontalDivisionsValidator),
  },
  returns: v.id("leagueSettings"),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const existing = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sportType: args.sportType,
        ageCategories: args.ageCategories,
        positions: args.positions,
        enabledGenders: args.enabledGenders,
        horizontalDivisions: args.horizontalDivisions,
      });
      return existing._id;
    }

    return await ctx.db.insert("leagueSettings", {
      organizationId: organization._id,
      sportType: args.sportType,
      ageCategories: args.ageCategories,
      positions: args.positions,
      enabledGenders: args.enabledGenders,
      horizontalDivisions: args.horizontalDivisions,
    });
  },
});

/**
 * Add an age category.
 */
export const addAgeCategory = mutation({
  args: {
    leagueSlug: v.string(),
    category: ageCategoryValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);
    const categoryName = normalizeSpaces(args.category.name);
    if (!categoryName) {
      throw new Error("Age category name is required");
    }
    if (args.category.minAge > args.category.maxAge) {
      throw new Error("Minimum age cannot be greater than maximum age");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      // Create settings with just this category
      await ctx.db.insert("leagueSettings", {
        organizationId: organization._id,
        sportType: "basketball",
        ageCategories: [{ ...args.category, name: categoryName }],
        positions: [],
        enabledGenders: ["male", "female"],
      });
      return null;
    }

    // Check for duplicate
    const semanticCategoryKey = normalizeAgeGroup(categoryName);
    const exists = settings.ageCategories.some(
      (c) =>
        c.id === args.category.id ||
        normalizeAgeGroup(c.name) === semanticCategoryKey,
    );
    if (exists) {
      throw new Error("Age category already exists");
    }

    await ctx.db.patch(settings._id, {
      ageCategories: [
        ...settings.ageCategories,
        { ...args.category, name: categoryName },
      ],
    });

    return null;
  },
});

/**
 * Remove an age category.
 */
export const removeAgeCategory = mutation({
  args: {
    leagueSlug: v.string(),
    categoryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      return null;
    }

    await ctx.db.patch(settings._id, {
      ageCategories: settings.ageCategories.filter(
        (c) => c.id !== args.categoryId,
      ),
    });

    return null;
  },
});

/**
 * Update an age category.
 */
export const updateAgeCategory = mutation({
  args: {
    leagueSlug: v.string(),
    categoryId: v.string(),
    name: v.string(),
    minAge: v.number(),
    maxAge: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const categoryName = normalizeSpaces(args.name);
    if (!categoryName) {
      throw new Error("Age category name is required");
    }
    if (args.minAge > args.maxAge) {
      throw new Error("Minimum age cannot be greater than maximum age");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      throw new Error("League settings not found");
    }

    const categoryExists = settings.ageCategories.some(
      (category) => category.id === args.categoryId,
    );
    if (!categoryExists) {
      throw new Error("Age category not found");
    }

    const currentCategory =
      settings.ageCategories.find(
        (category) => category.id === args.categoryId,
      ) ?? null;
    if (!currentCategory) {
      throw new Error("Age category not found");
    }

    const semanticCategoryKey = normalizeAgeGroup(categoryName);
    const duplicateName = settings.ageCategories.some(
      (category) =>
        category.id !== args.categoryId &&
        normalizeAgeGroup(category.name) === semanticCategoryKey,
    );
    if (duplicateName) {
      throw new Error("Age category already exists");
    }

    await ctx.db.patch(settings._id, {
      ageCategories: settings.ageCategories.map((category) =>
        category.id === args.categoryId
          ? {
              ...category,
              name: categoryName,
              minAge: args.minAge,
              maxAge: args.maxAge,
            }
          : category,
      ),
    });

    await syncClubCategoriesForLeagueCategoryRename(ctx, {
      organizationId: organization._id,
      leagueCategoryId: args.categoryId,
      previousAgeGroup: currentCategory.name,
      nextAgeGroup: categoryName,
    });

    return null;
  },
});

/**
 * Update enabled genders.
 */
export const updateEnabledGenders = mutation({
  args: {
    leagueSlug: v.string(),
    enabledGenders: v.array(gender),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      // Create settings with enabled genders
      await ctx.db.insert("leagueSettings", {
        organizationId: organization._id,
        sportType: "basketball",
        ageCategories: [],
        positions: [],
        enabledGenders: args.enabledGenders,
      });
      return null;
    }

    await ctx.db.patch(settings._id, {
      enabledGenders: args.enabledGenders,
    });

    return null;
  },
});

/**
 * Update horizontal divisions configuration.
 */
export const updateHorizontalDivisions = mutation({
  args: {
    leagueSlug: v.string(),
    horizontalDivisions: v.optional(horizontalDivisionsValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      // Create settings with horizontal divisions
      await ctx.db.insert("leagueSettings", {
        organizationId: organization._id,
        sportType: "basketball",
        ageCategories: [],
        positions: [],
        enabledGenders: ["male", "female"],
        horizontalDivisions: args.horizontalDivisions,
      });
      return null;
    }

    await ctx.db.patch(settings._id, {
      horizontalDivisions: args.horizontalDivisions,
    });

    return null;
  },
});

/**
 * Add a position.
 */
export const addPosition = mutation({
  args: {
    leagueSlug: v.string(),
    position: positionValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      // Create settings with just this position
      await ctx.db.insert("leagueSettings", {
        organizationId: organization._id,
        sportType: "basketball",
        ageCategories: [],
        positions: [args.position],
        enabledGenders: ["male", "female"],
      });
      return null;
    }

    // Check for duplicate
    const currentPositions = settings.positions ?? [];
    const exists = currentPositions.some(
      (p) => p.id === args.position.id || p.name === args.position.name,
    );
    if (exists) {
      throw new Error("Position already exists");
    }

    await ctx.db.patch(settings._id, {
      positions: [...currentPositions, args.position],
    });

    return null;
  },
});

/**
 * Remove a position.
 */
export const removePosition = mutation({
  args: {
    leagueSlug: v.string(),
    positionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      return null;
    }

    const currentPositions = settings.positions ?? [];
    await ctx.db.patch(settings._id, {
      positions: currentPositions.filter((p) => p.id !== args.positionId),
    });

    return null;
  },
});

/**
 * Update a position.
 */
export const updatePosition = mutation({
  args: {
    leagueSlug: v.string(),
    positionId: v.string(),
    name: v.string(),
    abbreviation: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const positionName = args.name.trim();
    const positionAbbreviation = args.abbreviation.trim();
    if (!positionName || !positionAbbreviation) {
      throw new Error("Position name and abbreviation are required");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      throw new Error("League settings not found");
    }

    const currentPositions = settings.positions ?? [];
    const positionExists = currentPositions.some(
      (position) => position.id === args.positionId,
    );
    if (!positionExists) {
      throw new Error("Position not found");
    }

    const duplicatePosition = currentPositions.some(
      (position) =>
        position.id !== args.positionId &&
        (position.name === positionName ||
          position.abbreviation === positionAbbreviation),
    );
    if (duplicatePosition) {
      throw new Error("Position already exists");
    }

    await ctx.db.patch(settings._id, {
      positions: currentPositions.map((position) =>
        position.id === args.positionId
          ? {
              ...position,
              name: positionName,
              abbreviation: positionAbbreviation,
            }
          : position,
      ),
    });

    return null;
  },
});

/**
 * Add a season.
 */
export const addSeason = mutation({
  args: {
    leagueSlug: v.string(),
    season: seasonValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const seasonName = args.season.name.trim();
    if (!seasonName) {
      throw new Error("Season name is required");
    }

    if (
      !isIsoDateString(args.season.startDate) ||
      !isIsoDateString(args.season.endDate)
    ) {
      throw new Error("Season dates must use YYYY-MM-DD format");
    }

    if (args.season.startDate > args.season.endDate) {
      throw new Error("Season start date must be before end date");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings) {
      await ctx.db.insert("leagueSettings", {
        organizationId: organization._id,
        sportType: "basketball",
        ageCategories: [],
        positions: [],
        enabledGenders: ["male", "female"],
        seasons: [
          {
            ...args.season,
            name: seasonName,
          },
        ],
      });
      return null;
    }

    const currentSeasons = settings.seasons ?? [];
    const seasonAlreadyExists = currentSeasons.some(
      (season) => season.id === args.season.id || season.name === seasonName,
    );
    if (seasonAlreadyExists) {
      throw new Error("Season already exists");
    }

    await ctx.db.patch(settings._id, {
      seasons: [
        ...currentSeasons,
        {
          ...args.season,
          name: seasonName,
        },
      ],
    });

    return null;
  },
});

/**
 * Remove a season.
 */
export const removeSeason = mutation({
  args: {
    leagueSlug: v.string(),
    seasonId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings?.seasons?.length) {
      return null;
    }

    const seasonExists = settings.seasons.some(
      (season) => season.id === args.seasonId,
    );
    if (!seasonExists) {
      return null;
    }

    const gamesWithSeason = await ctx.db
      .query("games")
      .withIndex("byOrganizationAndSeason", (q) =>
        q.eq("organizationId", organization._id).eq("seasonId", args.seasonId),
      )
      .take(1);

    if (gamesWithSeason.length > 0) {
      throw new Error(
        "Season cannot be removed because there are games linked to it",
      );
    }

    await ctx.db.patch(settings._id, {
      seasons: settings.seasons.filter((season) => season.id !== args.seasonId),
    });

    return null;
  },
});

/**
 * Update a season.
 */
export const updateSeason = mutation({
  args: {
    leagueSlug: v.string(),
    seasonId: v.string(),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const seasonName = args.name.trim();
    if (!seasonName) {
      throw new Error("Season name is required");
    }
    if (!isIsoDateString(args.startDate) || !isIsoDateString(args.endDate)) {
      throw new Error("Season dates must use YYYY-MM-DD format");
    }
    if (args.startDate > args.endDate) {
      throw new Error("Season start date must be before end date");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();

    if (!settings?.seasons?.length) {
      throw new Error("Season not found");
    }

    const seasonExists = settings.seasons.some(
      (season) => season.id === args.seasonId,
    );
    if (!seasonExists) {
      throw new Error("Season not found");
    }

    const duplicateName = settings.seasons.some(
      (season) => season.id !== args.seasonId && season.name === seasonName,
    );
    if (duplicateName) {
      throw new Error("Season already exists");
    }

    const gamesWithSeason = await ctx.db
      .query("games")
      .withIndex("byOrganizationAndSeason", (q) =>
        q.eq("organizationId", organization._id).eq("seasonId", args.seasonId),
      )
      .collect();

    const gameOutOfRange = gamesWithSeason.some(
      (game) => game.date < args.startDate || game.date > args.endDate,
    );
    if (gameOutOfRange) {
      throw new Error("Season range must include all linked games");
    }

    await ctx.db.patch(settings._id, {
      seasons: settings.seasons.map((season) =>
        season.id === args.seasonId
          ? {
              ...season,
              name: seasonName,
              startDate: args.startDate,
              endDate: args.endDate,
            }
          : season,
      ),
    });

    return null;
  },
});
