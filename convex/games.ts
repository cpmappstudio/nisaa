import { v } from "convex/values";
import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { deleteBasketballGamePlayerStatsByGame } from "./lib/basketballGamePlayerStats";
import { loadClubsWithLogos } from "./lib/clubLogos";
import {
  requireGameAccess,
  requireGameAdminAccess,
} from "./lib/gamePermissions";
import {
  hasOrgAdminAccess,
  requireOrgAdmin,
  requireClubAccessBySlug,
} from "./lib/permissions";
import { resolveOrganizationBySlug } from "./lib/organizationResolver";
import {
  confirmOpponentStatsHandler,
  forceCompleteHandler,
  getGamePlayerStatsHandler,
  getSeasonLeadersHandler,
  getSeasonStatsTableHandler,
  submitTeamStatsHandler,
} from "./basketball/games";
import {
  playerStatInputValidator,
  playerStatsValidator,
  seasonPlayerLeaderValidator,
  seasonPlayerStatsRowValidator,
  seasonTeamLeaderValidator,
  seasonTeamStatsRowValidator,
  seasonValidator,
} from "./basketball/validators";

type PermissionCtx = QueryCtx | MutationCtx;

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// ============================================================================
// VALIDATORS
// ============================================================================

const gender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const gameStatus = v.union(
  v.literal("scheduled"),
  v.literal("awaiting_stats"),
  v.literal("pending_review"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const gameType = v.union(v.literal("quick"), v.literal("season"));

const gameValidator = v.object({
  _id: v.id("games"),
  _creationTime: v.number(),
  organizationId: v.id("organizations"),
  seasonId: v.optional(v.string()),
  homeClubId: v.id("clubs"),
  awayClubId: v.id("clubs"),
  homeClubSlug: v.string(),
  awayClubSlug: v.string(),
  homeTeamName: v.string(),
  awayTeamName: v.string(),
  homeTeamLogo: v.optional(v.string()),
  awayTeamLogo: v.optional(v.string()),
  homeTeamColor: v.optional(v.string()),
  awayTeamColor: v.optional(v.string()),
  date: v.string(),
  startTime: v.string(),
  category: v.string(),
  gender: gender,
  locationName: v.optional(v.string()),
  locationCoordinates: v.optional(v.array(v.number())),
  status: gameStatus,
  homeScore: v.optional(v.number()),
  awayScore: v.optional(v.number()),
  homeStatsSubmittedAt: v.optional(v.number()),
  awayStatsSubmittedAt: v.optional(v.number()),
  homeStatsConfirmed: v.optional(v.boolean()),
  awayStatsConfirmed: v.optional(v.boolean()),
});

const gameListItemValidator = v.object({
  _id: v.id("games"),
  _creationTime: v.number(),
  seasonId: v.optional(v.string()),
  gameType: gameType,
  homeTeamId: v.string(),
  homeTeamName: v.string(),
  homeTeamLogo: v.optional(v.string()),
  awayTeamId: v.string(),
  awayTeamName: v.string(),
  awayTeamLogo: v.optional(v.string()),
  date: v.string(),
  startTime: v.string(),
  category: v.string(),
  gender: gender,
  locationName: v.optional(v.string()),
  locationCoordinates: v.optional(v.array(v.number())),
  status: gameStatus,
  homeScore: v.optional(v.number()),
  awayScore: v.optional(v.number()),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List games by league (organization) slug.
 */
export const listByLeagueSlug = query({
  args: { orgSlug: v.string() },
  returns: v.array(gameListItemValidator),
  handler: async (ctx, args) => {
    const org = await resolveOrganizationBySlug(ctx, args.orgSlug);

    if (!org) {
      return [];
    }

    const user = await getCurrentUser(ctx);
    const isOrgAdmin = await hasOrgAdminAccess(ctx, user._id, org._id);
    if (!isOrgAdmin) {
      throw new Error("Admin access required");
    }

    const games = await ctx.db
      .query("games")
      .withIndex("byOrganization", (q) => q.eq("organizationId", org._id))
      .order("desc")
      .collect();

    const { clubMap, clubLogoMap } = await loadClubsWithLogos(
      ctx,
      games.flatMap((game) => [game.homeClubId, game.awayClubId]),
    );

    const result: Array<{
      _id: Id<"games">;
      _creationTime: number;
      seasonId?: string;
      gameType: "quick" | "season";
      homeTeamId: string;
      homeTeamName: string;
      homeTeamLogo?: string;
      awayTeamId: string;
      awayTeamName: string;
      awayTeamLogo?: string;
      date: string;
      startTime: string;
      category: string;
      gender: "male" | "female" | "mixed";
      locationName?: string;
      locationCoordinates?: number[];
      status:
        | "scheduled"
        | "awaiting_stats"
        | "pending_review"
        | "completed"
        | "cancelled";
      homeScore?: number;
      awayScore?: number;
    }> = [];

    for (const game of games) {
      const homeClub = clubMap.get(game.homeClubId);
      const awayClub = clubMap.get(game.awayClubId);

      result.push({
        _id: game._id,
        _creationTime: game._creationTime,
        seasonId: game.seasonId,
        gameType: game.seasonId ? "season" : "quick",
        homeTeamId: game.homeClubId,
        homeTeamName: homeClub?.name ?? "Unknown",
        homeTeamLogo: clubLogoMap.get(game.homeClubId),
        awayTeamId: game.awayClubId,
        awayTeamName: awayClub?.name ?? "Unknown",
        awayTeamLogo: clubLogoMap.get(game.awayClubId),
        date: game.date,
        startTime: game.startTime,
        category: game.category,
        gender: game.gender,
        locationName: game.locationName,
        locationCoordinates: game.locationCoordinates,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      });
    }

    return result;
  },
});

/**
 * List games by club slug (where the club is either home or away team).
 */
export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.array(gameListItemValidator),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);

    // Get games where club is home team
    const homeGames = await ctx.db
      .query("games")
      .withIndex("byHomeClub", (q) => q.eq("homeClubId", club._id))
      .collect();

    // Get games where club is away team
    const awayGames = await ctx.db
      .query("games")
      .withIndex("byAwayClub", (q) => q.eq("awayClubId", club._id))
      .collect();

    // Combine and deduplicate games
    const allGames = [...homeGames, ...awayGames];
    const uniqueGames = Array.from(
      new Map(allGames.map((g) => [g._id, g])).values(),
    );

    // Sort by date descending
    uniqueGames.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateB.getTime() - dateA.getTime();
    });

    const { clubMap, clubLogoMap } = await loadClubsWithLogos(
      ctx,
      uniqueGames.flatMap((game) => [game.homeClubId, game.awayClubId]),
    );

    const result: Array<{
      _id: Id<"games">;
      _creationTime: number;
      seasonId?: string;
      gameType: "quick" | "season";
      homeTeamId: string;
      homeTeamName: string;
      homeTeamLogo?: string;
      awayTeamId: string;
      awayTeamName: string;
      awayTeamLogo?: string;
      date: string;
      startTime: string;
      category: string;
      gender: "male" | "female" | "mixed";
      locationName?: string;
      locationCoordinates?: number[];
      status:
        | "scheduled"
        | "awaiting_stats"
        | "pending_review"
        | "completed"
        | "cancelled";
      homeScore?: number;
      awayScore?: number;
    }> = [];

    for (const game of uniqueGames) {
      const homeClub = clubMap.get(game.homeClubId);
      const awayClub = clubMap.get(game.awayClubId);

      result.push({
        _id: game._id,
        _creationTime: game._creationTime,
        seasonId: game.seasonId,
        gameType: game.seasonId ? "season" : "quick",
        homeTeamId: game.homeClubId,
        homeTeamName: homeClub?.name ?? "Unknown",
        homeTeamLogo: clubLogoMap.get(game.homeClubId),
        awayTeamId: game.awayClubId,
        awayTeamName: awayClub?.name ?? "Unknown",
        awayTeamLogo: clubLogoMap.get(game.awayClubId),
        date: game.date,
        startTime: game.startTime,
        category: game.category,
        gender: game.gender,
        locationName: game.locationName,
        locationCoordinates: game.locationCoordinates,
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      });
    }

    return result;
  },
});

/**
 * Get player stats for a game.
 */
export const getGamePlayerStats = query({
  args: { gameId: v.id("games") },
  returns: v.object({
    homeStats: v.array(playerStatsValidator),
    awayStats: v.array(playerStatsValidator),
  }),
  handler: getGamePlayerStatsHandler,
});

/**
 * Get season leaders for players and teams.
 * Only completed season games are considered.
 */
export const getSeasonLeaders = query({
  args: {
    orgSlug: v.string(),
    seasonId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    season: seasonValidator,
    gamesCount: v.number(),
    leaderLimit: v.number(),
    playerLeaders: v.object({
      pointsPerGame: v.array(seasonPlayerLeaderValidator),
      reboundsPerGame: v.array(seasonPlayerLeaderValidator),
      assistsPerGame: v.array(seasonPlayerLeaderValidator),
      stealsPerGame: v.array(seasonPlayerLeaderValidator),
      blocksPerGame: v.array(seasonPlayerLeaderValidator),
    }),
    teamLeaders: v.object({
      pointsForPerGame: v.array(seasonTeamLeaderValidator),
      pointsAllowedPerGame: v.array(seasonTeamLeaderValidator),
      reboundsPerGame: v.array(seasonTeamLeaderValidator),
      assistsPerGame: v.array(seasonTeamLeaderValidator),
      winPct: v.array(seasonTeamLeaderValidator),
    }),
  }),
  handler: getSeasonLeadersHandler,
});

/**
 * Get detailed season stats for players and teams.
 * Only completed season games are considered.
 */
export const getSeasonStatsTable = query({
  args: {
    orgSlug: v.string(),
    seasonId: v.string(),
  },
  returns: v.object({
    season: seasonValidator,
    gamesCount: v.number(),
    players: v.array(seasonPlayerStatsRowValidator),
    teams: v.array(seasonTeamStatsRowValidator),
  }),
  handler: getSeasonStatsTableHandler,
});

/**
 * Get a game by ID with team details.
 */
export const getById = query({
  args: { gameId: v.id("games") },
  returns: v.union(gameValidator, v.null()),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);

    if (!game) {
      return null;
    }

    await requireGameAccess(ctx, game);

    const homeClub = await ctx.db.get(game.homeClubId);
    const awayClub = await ctx.db.get(game.awayClubId);

    let homeTeamLogo: string | undefined;
    let awayTeamLogo: string | undefined;

    if (homeClub?.logoStorageId) {
      homeTeamLogo =
        (await ctx.storage.getUrl(homeClub.logoStorageId)) ?? undefined;
    }
    if (awayClub?.logoStorageId) {
      awayTeamLogo =
        (await ctx.storage.getUrl(awayClub.logoStorageId)) ?? undefined;
    }

    return {
      _id: game._id,
      _creationTime: game._creationTime,
      organizationId: game.organizationId,
      seasonId: game.seasonId,
      homeClubId: game.homeClubId,
      awayClubId: game.awayClubId,
      homeClubSlug: homeClub?.slug ?? "",
      awayClubSlug: awayClub?.slug ?? "",
      homeTeamName: homeClub?.name ?? "Unknown",
      awayTeamName: awayClub?.name ?? "Unknown",
      homeTeamLogo,
      awayTeamLogo,
      homeTeamColor: homeClub?.colors?.[0] ?? undefined,
      awayTeamColor: awayClub?.colors?.[0] ?? undefined,
      date: game.date,
      startTime: game.startTime,
      category: game.category,
      gender: game.gender,
      locationName: game.locationName,
      locationCoordinates: game.locationCoordinates,
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeStatsSubmittedAt: game.homeStatsSubmittedAt,
      awayStatsSubmittedAt: game.awayStatsSubmittedAt,
      homeStatsConfirmed: game.homeStatsConfirmed,
      awayStatsConfirmed: game.awayStatsConfirmed,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new game.
 */
export const create = mutation({
  args: {
    orgSlug: v.string(),
    seasonId: v.optional(v.string()),
    homeClubId: v.id("clubs"),
    awayClubId: v.id("clubs"),
    date: v.string(),
    startTime: v.string(),
    category: v.string(),
    gender: gender,
    locationName: v.optional(v.string()),
    locationCoordinates: v.optional(v.array(v.number())),
  },
  returns: v.id("games"),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.orgSlug);

    // Validate clubs exist and belong to org
    const homeClub = await ctx.db.get(args.homeClubId);
    const awayClub = await ctx.db.get(args.awayClubId);

    if (!homeClub || homeClub.organizationId !== organization._id) {
      throw new Error("Home club not found or doesn't belong to this league");
    }
    if (!awayClub || awayClub.organizationId !== organization._id) {
      throw new Error("Away club not found or doesn't belong to this league");
    }

    if (homeClub.status !== "affiliated" || awayClub.status !== "affiliated") {
      throw new Error("Only affiliated teams can be scheduled for games");
    }

    if (args.homeClubId === args.awayClubId) {
      throw new Error("Home and away clubs must be different");
    }

    if (!isIsoDateString(args.date)) {
      throw new Error("Game date must use YYYY-MM-DD format");
    }

    if (args.seasonId) {
      const settings = await ctx.db
        .query("leagueSettings")
        .withIndex("byOrganization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .unique();

      const season = (settings?.seasons ?? []).find(
        (item) => item.id === args.seasonId,
      );
      if (!season) {
        throw new Error("Selected season not found");
      }

      const today = getTodayDateString();
      if (season.startDate > today || season.endDate < today) {
        throw new Error("Selected season is not currently active");
      }

      if (args.date < season.startDate || args.date > season.endDate) {
        throw new Error("Game date must be within the selected season range");
      }
    }

    return await ctx.db.insert("games", {
      organizationId: organization._id,
      seasonId: args.seasonId,
      homeClubId: args.homeClubId,
      awayClubId: args.awayClubId,
      date: args.date,
      startTime: args.startTime,
      category: args.category,
      gender: args.gender,
      locationName: args.locationName,
      locationCoordinates: args.locationCoordinates,
      status: "scheduled",
    });
  },
});

/**
 * Update game details.
 */
export const update = mutation({
  args: {
    gameId: v.id("games"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    category: v.optional(v.string()),
    gender: v.optional(gender),
    locationName: v.optional(v.string()),
    locationCoordinates: v.optional(v.array(v.number())),
    status: v.optional(gameStatus),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    await requireGameAdminAccess(ctx, game.organizationId);

    const { gameId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(gameId, filteredUpdates);
    }

    return null;
  },
});

/**
 * Delete a game.
 */
export const remove = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    await requireGameAdminAccess(ctx, game.organizationId);

    // Delete game player stats
    await deleteBasketballGamePlayerStatsByGame(ctx, args.gameId);

    // Delete the game
    await ctx.db.delete(args.gameId);

    return null;
  },
});

// ============================================================================
// STATS SUBMISSION
// ============================================================================

/**
 * Submit team stats for a game.
 * Called by a team's staff after the game starts.
 */
export const submitTeamStats = mutation({
  args: {
    gameId: v.id("games"),
    clubId: v.id("clubs"),
    playerStats: v.array(playerStatInputValidator),
    teamScore: v.number(),
  },
  returns: v.null(),
  handler: submitTeamStatsHandler,
});

/**
 * Confirm the opponent's stats.
 * Called after reviewing the other team's submitted stats.
 */
export const confirmOpponentStats = mutation({
  args: {
    gameId: v.id("games"),
    clubId: v.id("clubs"),
  },
  returns: v.null(),
  handler: confirmOpponentStatsHandler,
});

/**
 * Force complete a game (admin only).
 */
export const forceComplete = mutation({
  args: {
    gameId: v.id("games"),
  },
  returns: v.null(),
  handler: forceCompleteHandler,
});
