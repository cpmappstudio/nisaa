import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import {
  deriveCategorySelectionFromExistingClubCategory,
  ensureClubCategoryForLeagueSelection,
  getClubLeagueCategoryConfig,
} from "./lib/categories/helpers";
import {
  requireClubAccess,
  requireClubAccessBySlug,
  requireOrgAdmin,
} from "./lib/permissions";

// ============================================================================
// VALIDATORS
// ============================================================================

const playerStatus = v.union(v.literal("active"), v.literal("inactive"));
const categoryGender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);
const playerViewerAccessLevel = v.union(
  v.literal("superadmin"),
  v.literal("admin"),
  v.literal("coach"),
);
const playerHighlightValidator = v.object({
  id: v.string(),
  title: v.string(),
  url: v.string(),
  videoId: v.string(),
});
const playerGameLogRowValidator = v.object({
  gameId: v.id("games"),
  date: v.string(),
  startTime: v.string(),
  gameType: v.union(v.literal("quick"), v.literal("season")),
  teamName: v.string(),
  teamNickname: v.optional(v.string()),
  opponentName: v.string(),
  opponentNickname: v.optional(v.string()),
  result: v.union(v.literal("W"), v.literal("L"), v.literal("—")),
  teamScore: v.optional(v.number()),
  opponentScore: v.optional(v.number()),
  minutes: v.number(),
  points: v.number(),
  rebounds: v.number(),
  assists: v.number(),
  steals: v.number(),
  blocks: v.number(),
  plusMinus: v.number(),
});

const basketballPlayerValidator = v.object({
  _id: v.id("players"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  photoUrl: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  jerseyNumber: v.optional(v.number()),
  position: v.optional(v.string()),
  status: playerStatus,
  height: v.optional(v.number()),
  weight: v.optional(v.number()),
  bioTitle: v.optional(v.string()),
  bioContent: v.optional(v.string()),
  country: v.optional(v.string()),
  categoryId: v.id("categories"),
  categoryLeagueCategoryId: v.optional(v.string()),
  categoryName: v.optional(v.string()),
  categoryAgeGroup: v.optional(v.string()),
  categoryGender: v.optional(categoryGender),
  clubSlug: v.string(),
  clubName: v.string(),
  clubNickname: v.optional(v.string()),
});

const basketballPlayerDetailValidator = v.object({
  _id: v.id("players"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  photoUrl: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  jerseyNumber: v.optional(v.number()),
  position: v.optional(v.string()),
  status: playerStatus,
  height: v.optional(v.number()),
  weight: v.optional(v.number()),
  bioTitle: v.optional(v.string()),
  bioContent: v.optional(v.string()),
  country: v.optional(v.string()),
  categoryId: v.id("categories"),
  categoryLeagueCategoryId: v.optional(v.string()),
  categoryName: v.optional(v.string()),
  categoryAgeGroup: v.optional(v.string()),
  categoryGender: v.optional(categoryGender),
  clubId: v.id("clubs"),
  clubName: v.string(),
  clubSlug: v.string(),
  clubLogoUrl: v.optional(v.string()),
  clubPrimaryColor: v.optional(v.string()),
  highlights: v.array(playerHighlightValidator),
  gamesPlayed: v.number(),
  pointsPerGame: v.number(),
  reboundsPerGame: v.number(),
  assistsPerGame: v.number(),
  viewerAccessLevel: playerViewerAccessLevel,
});

function roundToSingleDecimal(value: number): number {
  return Number(value.toFixed(1));
}

function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let candidate = "";

    if (host === "youtu.be") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      candidate = parts[0] ?? "";
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        candidate = parsed.searchParams.get("v") ?? "";
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts[0] === "shorts" || parts[0] === "embed") {
          candidate = parts[1] ?? "";
        }
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List basketball players by club slug.
 * Returns data formatted for the players table/grid.
 */
export const listBasketballPlayersByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.array(basketballPlayerValidator),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);

    const players = await ctx.db
      .query("players")
      .withIndex("byClub", (q) => q.eq("clubId", club._id))
      .collect();
    const basketballPlayers = players.filter(
      (player) => player.sportType === "basketball",
    );

    // Batch fetch categories
    const categoryIds = [
      ...new Set(basketballPlayers.map((p) => p.categoryId)),
    ];
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((c) => [c!._id, c!]),
    );

    // Build result with photo URLs
    const result = await Promise.all(
      basketballPlayers.map(async (player) => {
        const category = categoryMap.get(player.categoryId);
        const photoUrl = player.photoStorageId
          ? await ctx.storage.getUrl(player.photoStorageId)
          : undefined;

        return {
          _id: player._id,
          _creationTime: player._creationTime,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: photoUrl ?? undefined,
          dateOfBirth: player.dateOfBirth,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          status: player.status,
          height: player.height,
          weight: player.weight,
          country: player.country,
          categoryId: player.categoryId,
          categoryLeagueCategoryId: category?.leagueCategoryId,
          categoryName: category?.name,
          categoryAgeGroup: category?.ageGroup,
          categoryGender: category?.gender,
          clubSlug: club.slug,
          clubName: club.name,
          clubNickname: club.nickname,
        };
      }),
    );

    return result;
  },
});

/**
 * List basketball players across all clubs in a league.
 * Used by org-level roster views.
 */
export const listBasketballPlayersByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(basketballPlayerValidator),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);

    const clubs = await ctx.db
      .query("clubs")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .collect();

    if (clubs.length === 0) {
      return [];
    }

    const clubMap = new Map(clubs.map((club) => [club._id, club]));
    const playersByClub = await Promise.all(
      clubs.map((club) =>
        ctx.db
          .query("players")
          .withIndex("byClub", (q) => q.eq("clubId", club._id))
          .collect(),
      ),
    );
    const players = playersByClub
      .flat()
      .filter((player) => player.sportType === "basketball")
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      );

    const categoryIds = [
      ...new Set(players.map((player) => player.categoryId)),
    ];
    const categories = await Promise.all(
      categoryIds.map((categoryId) => ctx.db.get(categoryId)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((category) => [category!._id, category!]),
    );

    const result = await Promise.all(
      players.map(async (player) => {
        const club = clubMap.get(player.clubId)!;
        const category = categoryMap.get(player.categoryId);
        const photoUrl = player.photoStorageId
          ? await ctx.storage.getUrl(player.photoStorageId)
          : undefined;

        return {
          _id: player._id,
          _creationTime: player._creationTime,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: photoUrl ?? undefined,
          dateOfBirth: player.dateOfBirth,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          status: player.status,
          height: player.height,
          weight: player.weight,
          bioTitle: player.bioTitle,
          bioContent: player.bioContent,
          country: player.country,
          categoryId: player.categoryId,
          categoryLeagueCategoryId: category?.leagueCategoryId,
          categoryName: category?.name,
          categoryAgeGroup: category?.ageGroup,
          categoryGender: category?.gender,
          clubSlug: club.slug,
          clubName: club.name,
          clubNickname: club.nickname,
        };
      }),
    );

    return result;
  },
});

/**
 * Get basketball player details by player ID within a specific club slug.
 * Returns null when player does not exist or does not belong to the provided club.
 */
export const getBasketballPlayerDetailByClubSlug = query({
  args: {
    clubSlug: v.string(),
    playerId: v.id("players"),
  },
  returns: v.union(basketballPlayerDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const { club, accessLevel } = await requireClubAccessBySlug(
      ctx,
      args.clubSlug,
    );

    const player = await ctx.db.get(args.playerId);
    if (
      !player ||
      player.clubId !== club._id ||
      player.sportType !== "basketball"
    ) {
      return null;
    }

    const category = await ctx.db.get(player.categoryId);
    const playerStats = await ctx.db
      .query("gamePlayerStats")
      .withIndex("byPlayer", (q) => q.eq("playerId", player._id))
      .collect();

    const linkedGames = await Promise.all(
      playerStats.map((stat) => ctx.db.get(stat.gameId)),
    );

    let gamesPlayed = 0;
    let points = 0;
    let rebounds = 0;
    let assists = 0;

    for (let index = 0; index < playerStats.length; index += 1) {
      const stat = playerStats[index];
      const game = linkedGames[index];

      if (
        !game ||
        game.organizationId !== club.organizationId ||
        game.status !== "completed" ||
        typeof game.homeScore !== "number" ||
        typeof game.awayScore !== "number"
      ) {
        continue;
      }

      gamesPlayed += 1;
      points += stat.points ?? 0;
      rebounds += (stat.offensiveRebounds ?? 0) + (stat.defensiveRebounds ?? 0);
      assists += stat.assists ?? 0;
    }

    const pointsPerGame =
      gamesPlayed > 0 ? roundToSingleDecimal(points / gamesPlayed) : 0;
    const reboundsPerGame =
      gamesPlayed > 0 ? roundToSingleDecimal(rebounds / gamesPlayed) : 0;
    const assistsPerGame =
      gamesPlayed > 0 ? roundToSingleDecimal(assists / gamesPlayed) : 0;

    const photoUrl = player.photoStorageId
      ? await ctx.storage.getUrl(player.photoStorageId)
      : undefined;
    const clubLogoUrl = club.logoStorageId
      ? await ctx.storage.getUrl(club.logoStorageId)
      : undefined;

    return {
      _id: player._id,
      _creationTime: player._creationTime,
      firstName: player.firstName,
      lastName: player.lastName,
      photoUrl: photoUrl ?? undefined,
      dateOfBirth: player.dateOfBirth,
      jerseyNumber: player.jerseyNumber,
      position: player.position,
      status: player.status,
      height: player.height,
      weight: player.weight,
      bioTitle: player.bioTitle,
      bioContent: player.bioContent,
      country: player.country,
      categoryId: player.categoryId,
      categoryLeagueCategoryId: category?.leagueCategoryId,
      categoryName: category?.name,
      categoryAgeGroup: category?.ageGroup,
      categoryGender: category?.gender,
      clubId: club._id,
      clubName: club.name,
      clubSlug: club.slug,
      clubLogoUrl: clubLogoUrl ?? undefined,
      clubPrimaryColor: club.colors?.[0],
      highlights: player.highlights ?? [],
      gamesPlayed,
      pointsPerGame,
      reboundsPerGame,
      assistsPerGame,
      viewerAccessLevel: accessLevel,
    };
  },
});

/**
 * List recent game log rows for a basketball player.
 * Includes quick and season games with completed box score stats.
 */
export const listBasketballPlayerGameLog = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  returns: v.array(playerGameLogRowValidator),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player || player.sportType !== "basketball") {
      return [];
    }

    const { organization } = await requireClubAccess(ctx, player.clubId);

    const requestedLimit = Math.floor(args.limit ?? 50);
    const boundedLimit = Math.max(
      1,
      Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 50, 200),
    );

    const stats = await ctx.db
      .query("gamePlayerStats")
      .withIndex("byPlayer", (q) => q.eq("playerId", player._id))
      .collect();

    if (stats.length === 0) {
      return [];
    }

    const linkedGames = await Promise.all(
      stats.map((stat) => ctx.db.get(stat.gameId)),
    );

    const rowsWithOpponentId: Array<{
      gameId: Id<"games">;
      date: string;
      startTime: string;
      gameType: "quick" | "season";
      teamId: Id<"clubs">;
      opponentId: Id<"clubs">;
      result: "W" | "L" | "—";
      teamScore?: number;
      opponentScore?: number;
      minutes: number;
      points: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      plusMinus: number;
      sortKey: number;
    }> = [];
    const relatedClubIds = new Set<Id<"clubs">>();

    for (let index = 0; index < stats.length; index += 1) {
      const stat = stats[index];
      const game = linkedGames[index];
      if (!game || game.organizationId !== organization._id) {
        continue;
      }

      if (game.status !== "completed") {
        continue;
      }

      const playedAsHome = stat.clubId === game.homeClubId;
      const playedAsAway = stat.clubId === game.awayClubId;
      if (!playedAsHome && !playedAsAway) {
        continue;
      }

      const opponentId = playedAsHome ? game.awayClubId : game.homeClubId;
      relatedClubIds.add(stat.clubId);
      relatedClubIds.add(opponentId);

      const teamScore = playedAsHome ? game.homeScore : game.awayScore;
      const opponentScore = playedAsHome ? game.awayScore : game.homeScore;

      let result: "W" | "L" | "—" = "—";
      if (typeof teamScore === "number" && typeof opponentScore === "number") {
        if (teamScore > opponentScore) {
          result = "W";
        } else if (teamScore < opponentScore) {
          result = "L";
        }
      }

      const [year, month, day] = game.date.split("-").map(Number);
      const [hours = 0, minutes = 0] = game.startTime.split(":").map(Number);
      const sortKey = Date.UTC(
        year,
        (month || 1) - 1,
        day || 1,
        hours,
        minutes,
      );

      rowsWithOpponentId.push({
        gameId: game._id,
        date: game.date,
        startTime: game.startTime,
        gameType: game.seasonId ? "season" : "quick",
        teamId: stat.clubId,
        opponentId,
        result,
        teamScore,
        opponentScore,
        minutes: stat.minutes ?? 0,
        points: stat.points ?? 0,
        rebounds: (stat.offensiveRebounds ?? 0) + (stat.defensiveRebounds ?? 0),
        assists: stat.assists ?? 0,
        steals: stat.steals ?? 0,
        blocks: stat.blocks ?? 0,
        plusMinus: stat.plusMinus ?? 0,
        sortKey,
      });
    }

    if (rowsWithOpponentId.length === 0) {
      return [];
    }

    const relatedClubs = await Promise.all(
      [...relatedClubIds].map((clubId) => ctx.db.get(clubId)),
    );
    const clubMap = new Map(
      relatedClubs.filter(Boolean).map((club) => [club!._id, club!]),
    );

    return rowsWithOpponentId
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, boundedLimit)
      .map(({ teamId, opponentId, ...row }) => {
        const { sortKey, ...resultRow } = row;
        void sortKey;

        return {
          ...resultRow,
          teamName: clubMap.get(teamId)?.name ?? "Unknown",
          teamNickname: clubMap.get(teamId)?.nickname,
          opponentName: clubMap.get(opponentId)?.name ?? "Unknown",
          opponentNickname: clubMap.get(opponentId)?.nickname,
        };
      });
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Generate upload URL for player photo.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new player.
 */
export const createPlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    clubSlug: v.optional(v.string()),
    leagueCategoryId: v.optional(v.string()),
    gender: v.optional(categoryGender),
    division: v.optional(v.string()),
    sportType: v.union(v.literal("basketball"), v.literal("soccer")),
    jerseyNumber: v.optional(v.number()),
    position: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    country: v.optional(v.string()),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    let resolvedClubId: Id<"clubs">;
    let resolvedCategoryId: Id<"categories">;

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      await requireClubAccess(ctx, category.clubId);
      resolvedClubId = category.clubId;
      resolvedCategoryId = category._id;
    } else {
      if (!args.clubSlug || !args.leagueCategoryId || !args.gender) {
        throw new Error(
          "clubSlug, leagueCategoryId, and gender are required when categoryId is not provided",
        );
      }

      const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);
      const resolvedCategory = await ensureClubCategoryForLeagueSelection(ctx, {
        clubId: club._id,
        leagueCategoryId: args.leagueCategoryId,
        gender: args.gender,
        division: args.division,
      });

      resolvedClubId = club._id;
      resolvedCategoryId = resolvedCategory.categoryId;
    }

    const playerId = await ctx.db.insert("players", {
      firstName: args.firstName,
      lastName: args.lastName,
      photoStorageId: args.photoStorageId,
      dateOfBirth: args.dateOfBirth,
      clubId: resolvedClubId,
      categoryId: resolvedCategoryId,
      sportType: args.sportType,
      jerseyNumber: args.jerseyNumber,
      position: args.position,
      height: args.height,
      weight: args.weight,
      country: args.country,
      status: "active",
    });

    return playerId;
  },
});

/**
 * Delete a player.
 */
export const deletePlayer = mutation({
  args: { playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    // Delete photo from storage if exists
    if (player.photoStorageId) {
      await ctx.storage.delete(player.photoStorageId);
    }

    await ctx.db.delete(args.playerId);

    return null;
  },
});

/**
 * Update a player.
 */
export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),
    jerseyNumber: v.optional(v.number()),
    position: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    country: v.optional(v.string()),
    status: v.optional(playerStatus),
    categoryId: v.optional(v.id("categories")),
    leagueCategoryId: v.optional(v.string()),
    gender: v.optional(categoryGender),
    division: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    const { playerId, leagueCategoryId, gender, division, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (args.categoryId) {
      const targetCategory = await ctx.db.get(args.categoryId);
      if (!targetCategory) {
        throw new Error("Category not found");
      }

      await requireClubAccess(ctx, targetCategory.clubId);
      filteredUpdates.clubId = targetCategory.clubId;
      filteredUpdates.categoryId = targetCategory._id;
    } else {
      const shouldResyncCategory =
        Boolean(leagueCategoryId) ||
        division !== undefined ||
        gender !== undefined;

      if (shouldResyncCategory) {
        const currentCategory = await ctx.db.get(player.categoryId);
        if (!currentCategory) {
          throw new Error("Current player category not found");
        }

        const { ageCategories } = await getClubLeagueCategoryConfig(
          ctx,
          player.clubId,
        );
        const currentSelection =
          deriveCategorySelectionFromExistingClubCategory({
            ageCategories,
            category: currentCategory,
          });

        const targetLeagueCategoryId =
          leagueCategoryId ?? currentSelection.leagueCategoryId;
        if (!targetLeagueCategoryId) {
          throw new Error(
            "Current player category is no longer available in league settings. Select a new category.",
          );
        }

        const resolvedCategory = await ensureClubCategoryForLeagueSelection(
          ctx,
          {
            clubId: player.clubId,
            leagueCategoryId: targetLeagueCategoryId,
            gender: gender ?? currentCategory.gender,
            division: division ?? currentSelection.division,
          },
        );
        filteredUpdates.categoryId = resolvedCategory.categoryId;
        filteredUpdates.clubId = player.clubId;
      }
    }

    // If updating photo, delete old one
    if (
      filteredUpdates.photoStorageId &&
      player.photoStorageId &&
      filteredUpdates.photoStorageId !== player.photoStorageId
    ) {
      await ctx.storage.delete(player.photoStorageId);
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(playerId, filteredUpdates);
    }

    return null;
  },
});

/**
 * Update a player's bio fields.
 * Available for users with coach/admin access to the player's club.
 */
export const updatePlayerBio = mutation({
  args: {
    playerId: v.id("players"),
    bioTitle: v.string(),
    bioContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    await ctx.db.patch(args.playerId, {
      bioTitle: args.bioTitle.trim(),
      bioContent: args.bioContent.trim(),
    });

    return null;
  },
});

/**
 * Add a highlight video to a player profile.
 * Available for users with coach/admin access to the player's club.
 */
export const addPlayerHighlight = mutation({
  args: {
    playerId: v.id("players"),
    title: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    const trimmedTitle = args.title.trim();
    const trimmedUrl = args.url.trim();
    if (!trimmedTitle) {
      throw new Error("Highlight title is required");
    }
    if (!trimmedUrl) {
      throw new Error("Highlight URL is required");
    }

    const videoId = extractYouTubeVideoId(trimmedUrl);
    if (!videoId) {
      throw new Error("Only valid YouTube URLs are allowed");
    }

    const currentHighlights = player.highlights ?? [];
    if (currentHighlights.some((highlight) => highlight.videoId === videoId)) {
      throw new Error("This highlight already exists for the player");
    }

    if (currentHighlights.length >= 20) {
      throw new Error("Maximum number of highlights reached");
    }

    const newHighlight = {
      id: `${Date.now()}-${videoId}`,
      title: trimmedTitle,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    };

    await ctx.db.patch(args.playerId, {
      highlights: [...currentHighlights, newHighlight],
    });

    return null;
  },
});

/**
 * Update an existing highlight video in a player profile.
 * Available for users with coach/admin access to the player's club.
 */
export const updatePlayerHighlight = mutation({
  args: {
    playerId: v.id("players"),
    highlightId: v.string(),
    title: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    const trimmedTitle = args.title.trim();
    const trimmedUrl = args.url.trim();
    if (!trimmedTitle) {
      throw new Error("Highlight title is required");
    }
    if (!trimmedUrl) {
      throw new Error("Highlight URL is required");
    }

    const videoId = extractYouTubeVideoId(trimmedUrl);
    if (!videoId) {
      throw new Error("Only valid YouTube URLs are allowed");
    }

    const currentHighlights = player.highlights ?? [];
    const highlightIndex = currentHighlights.findIndex(
      (highlight) => highlight.id === args.highlightId,
    );
    if (highlightIndex === -1) {
      throw new Error("Highlight not found");
    }

    if (
      currentHighlights.some(
        (highlight) =>
          highlight.id !== args.highlightId && highlight.videoId === videoId,
      )
    ) {
      throw new Error("This highlight already exists for the player");
    }

    const updatedHighlights = [...currentHighlights];
    updatedHighlights[highlightIndex] = {
      ...updatedHighlights[highlightIndex],
      title: trimmedTitle,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    };

    await ctx.db.patch(args.playerId, {
      highlights: updatedHighlights,
    });

    return null;
  },
});

/**
 * Remove an existing highlight video from a player profile.
 * Available for users with coach/admin access to the player's club.
 */
export const removePlayerHighlight = mutation({
  args: {
    playerId: v.id("players"),
    highlightId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    const currentHighlights = player.highlights ?? [];
    if (
      !currentHighlights.some((highlight) => highlight.id === args.highlightId)
    ) {
      throw new Error("Highlight not found");
    }

    await ctx.db.patch(args.playerId, {
      highlights: currentHighlights.filter(
        (highlight) => highlight.id !== args.highlightId,
      ),
    });

    return null;
  },
});
