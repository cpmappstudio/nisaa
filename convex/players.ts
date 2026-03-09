import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { loadSoccerProfilesByPlayerIds } from "./lib/soccerPlayerProfiles";
import { getOrganizationSportType } from "./lib/sports";
import {
  requireClubAccess,
  requireClubAccessBySlug,
  requireOrgAdmin,
} from "./lib/permissions";
import {
  getBasketballPlayerDetailByClubSlugHandler,
  listBasketballPlayerGameLogHandler,
} from "./basketball/players";

// ============================================================================
// VALIDATORS
// ============================================================================

const playerStatus = v.union(v.literal("active"), v.literal("inactive"));
const playerGender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);
const dominantProfile = v.union(
  v.literal("right"),
  v.literal("left"),
  v.literal("both"),
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

const playerListItemValidator = v.object({
  _id: v.id("players"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  secondLastName: v.optional(v.string()),
  photoUrl: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  documentNumber: v.optional(v.string()),
  gender: v.optional(playerGender),
  jerseyNumber: v.optional(v.number()),
  position: v.optional(v.string()),
  status: playerStatus,
  height: v.optional(v.number()),
  weight: v.optional(v.number()),
  bioTitle: v.optional(v.string()),
  bioContent: v.optional(v.string()),
  country: v.optional(v.string()),
  cometNumber: v.optional(v.string()),
  fifaId: v.optional(v.string()),
  dominantProfile: v.optional(dominantProfile),
  categoryId: v.id("categories"),
  categoryName: v.optional(v.string()),
  clubSlug: v.string(),
  clubName: v.string(),
  clubNickname: v.optional(v.string()),
});

const basketballPlayerDetailValidator = v.object({
  _id: v.id("players"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  secondLastName: v.optional(v.string()),
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
  categoryName: v.optional(v.string()),
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

const playerDetailValidator = v.object({
  _id: v.id("players"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  secondLastName: v.optional(v.string()),
  sportType: v.union(v.literal("basketball"), v.literal("soccer")),
  photoUrl: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  documentNumber: v.optional(v.string()),
  gender: v.optional(playerGender),
  jerseyNumber: v.optional(v.number()),
  position: v.optional(v.string()),
  status: playerStatus,
  height: v.optional(v.number()),
  weight: v.optional(v.number()),
  bioTitle: v.optional(v.string()),
  bioContent: v.optional(v.string()),
  country: v.optional(v.string()),
  cometNumber: v.optional(v.string()),
  fifaId: v.optional(v.string()),
  dominantProfile: v.optional(dominantProfile),
  categoryId: v.id("categories"),
  categoryName: v.optional(v.string()),
  clubId: v.id("clubs"),
  clubName: v.string(),
  clubSlug: v.string(),
  clubLogoUrl: v.optional(v.string()),
  clubPrimaryColor: v.optional(v.string()),
  highlights: v.array(playerHighlightValidator),
  viewerAccessLevel: playerViewerAccessLevel,
});

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
 * List players by club slug.
 * Returns data formatted for roster and team settings views.
 */
export const listPlayersByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.array(playerListItemValidator),
  handler: async (ctx, args) => {
    const { club } = await requireClubAccessBySlug(ctx, args.clubSlug);
    const configuredSportType = await getOrganizationSportType(
      ctx,
      club.organizationId,
    );

    const players = await ctx.db
      .query("players")
      .withIndex("byClub", (q) => q.eq("clubId", club._id))
      .collect();
    const sportPlayers = players.filter(
      (player) => player.sportType === configuredSportType,
    );

    // Batch fetch categories
    const categoryIds = [...new Set(sportPlayers.map((p) => p.categoryId))];
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id)),
    );
    const categoryMap = new Map(
      categories.filter(Boolean).map((c) => [c!._id, c!]),
    );
    const soccerProfilesByPlayerId =
      configuredSportType === "soccer"
        ? await loadSoccerProfilesByPlayerIds(
            ctx,
            sportPlayers.map((player) => player._id),
          )
        : new Map();

    // Build result with photo URLs
    const result = await Promise.all(
      sportPlayers.map(async (player) => {
        const category = categoryMap.get(player.categoryId);
        const soccerProfile = soccerProfilesByPlayerId.get(player._id);
        const photoUrl = player.photoStorageId
          ? await ctx.storage.getUrl(player.photoStorageId)
          : undefined;

        return {
          _id: player._id,
          _creationTime: player._creationTime,
          firstName: player.firstName,
          lastName: player.lastName,
          secondLastName: player.secondLastName,
          photoUrl: photoUrl ?? undefined,
          dateOfBirth: player.dateOfBirth,
          documentNumber: player.documentNumber,
          gender: player.gender,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          status: player.status,
          height: player.height,
          weight: player.weight,
          country: player.country,
          cometNumber: soccerProfile?.cometNumber,
          fifaId: soccerProfile?.fifaId,
          dominantProfile: soccerProfile?.dominantProfile,
          categoryId: player.categoryId,
          categoryName: category?.name,
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
 * List players across all clubs in a league.
 * Used by org-level roster views.
 */
export const listPlayersByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(playerListItemValidator),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.leagueSlug);
    const configuredSportType = await getOrganizationSportType(
      ctx,
      organization._id,
    );

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
      .filter((player) => player.sportType === configuredSportType)
      .sort((a, b) =>
        `${a.lastName} ${a.secondLastName ?? ""} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.secondLastName ?? ""} ${b.firstName}`,
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
    const soccerProfilesByPlayerId =
      configuredSportType === "soccer"
        ? await loadSoccerProfilesByPlayerIds(
            ctx,
            players.map((player) => player._id),
          )
        : new Map();

    const result = await Promise.all(
      players.map(async (player) => {
        const club = clubMap.get(player.clubId)!;
        const category = categoryMap.get(player.categoryId);
        const soccerProfile = soccerProfilesByPlayerId.get(player._id);
        const photoUrl = player.photoStorageId
          ? await ctx.storage.getUrl(player.photoStorageId)
          : undefined;

        return {
          _id: player._id,
          _creationTime: player._creationTime,
          firstName: player.firstName,
          lastName: player.lastName,
          secondLastName: player.secondLastName,
          photoUrl: photoUrl ?? undefined,
          dateOfBirth: player.dateOfBirth,
          documentNumber: player.documentNumber,
          gender: player.gender,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          status: player.status,
          height: player.height,
          weight: player.weight,
          bioTitle: player.bioTitle,
          bioContent: player.bioContent,
          country: player.country,
          cometNumber: soccerProfile?.cometNumber,
          fifaId: soccerProfile?.fifaId,
          dominantProfile: soccerProfile?.dominantProfile,
          categoryId: player.categoryId,
          categoryName: category?.name,
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
 * Get player details by player ID within a specific club slug.
 * Returns shared identity/profile fields for the sport configured in the league.
 */
export const getPlayerDetailByClubSlug = query({
  args: {
    clubSlug: v.string(),
    playerId: v.id("players"),
  },
  returns: v.union(playerDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const { club, accessLevel } = await requireClubAccessBySlug(
      ctx,
      args.clubSlug,
    );

    const configuredSportType = await getOrganizationSportType(
      ctx,
      club.organizationId,
    );

    const player = await ctx.db.get(args.playerId);
    if (
      !player ||
      player.clubId !== club._id ||
      player.sportType !== configuredSportType
    ) {
      return null;
    }

    const category = await ctx.db.get(player.categoryId);
    const photoUrl = player.photoStorageId
      ? await ctx.storage.getUrl(player.photoStorageId)
      : undefined;
    const clubLogoUrl = club.logoStorageId
      ? await ctx.storage.getUrl(club.logoStorageId)
      : undefined;
    const soccerProfile =
      player.sportType === "soccer"
        ? (await loadSoccerProfilesByPlayerIds(ctx, [player._id])).get(
            player._id,
          )
        : undefined;

    return {
      _id: player._id,
      _creationTime: player._creationTime,
      firstName: player.firstName,
      lastName: player.lastName,
      secondLastName: player.secondLastName,
      sportType: player.sportType,
      photoUrl: photoUrl ?? undefined,
      dateOfBirth: player.dateOfBirth,
      documentNumber: player.documentNumber,
      gender: player.gender,
      jerseyNumber: player.jerseyNumber,
      position: player.position,
      status: player.status,
      height: player.height,
      weight: player.weight,
      bioTitle: player.bioTitle,
      bioContent: player.bioContent,
      country: player.country,
      cometNumber: soccerProfile?.cometNumber,
      fifaId: soccerProfile?.fifaId,
      dominantProfile: soccerProfile?.dominantProfile,
      categoryId: player.categoryId,
      categoryName: category?.name,
      clubId: club._id,
      clubName: club.name,
      clubSlug: club.slug,
      clubLogoUrl: clubLogoUrl ?? undefined,
      clubPrimaryColor: club.colors?.[0],
      highlights: player.highlights ?? [],
      viewerAccessLevel: accessLevel,
    };
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
  handler: getBasketballPlayerDetailByClubSlugHandler,
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
  handler: listBasketballPlayerGameLogHandler,
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
    categoryId: v.id("categories"),
    jerseyNumber: v.optional(v.number()),
    position: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    country: v.optional(v.string()),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    // Get category to find the club
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const { club } = await requireClubAccess(ctx, category.clubId);
    const configuredSportType = await getOrganizationSportType(
      ctx,
      club.organizationId,
    );

    const playerId = await ctx.db.insert("players", {
      firstName: args.firstName,
      lastName: args.lastName,
      photoStorageId: args.photoStorageId,
      dateOfBirth: args.dateOfBirth,
      clubId: category.clubId,
      categoryId: args.categoryId,
      sportType: configuredSportType,
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

    const { club } = await requireClubAccess(ctx, player.clubId);
    const configuredSportType = await getOrganizationSportType(
      ctx,
      club.organizationId,
    );
    if (configuredSportType !== player.sportType) {
      throw new Error("Player sport type does not match the league sport type");
    }

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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    await requireClubAccess(ctx, player.clubId);

    const { playerId, ...updates } = args;

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

      const targetAccess = await requireClubAccess(ctx, targetCategory.clubId);
      const targetSportType = await getOrganizationSportType(
        ctx,
        targetAccess.club.organizationId,
      );
      if (targetSportType !== player.sportType) {
        throw new Error("Target category must belong to the same sport type");
      }
      filteredUpdates.clubId = targetCategory.clubId;
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
