import { Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";
import { listBasketballGamePlayerStatsByPlayer } from "../lib/basketballGamePlayerStats";
import { requireClubAccess, requireClubAccessBySlug } from "../lib/permissions";
import { ensureOrganizationSportType } from "../lib/sports";

function roundToSingleDecimal(value: number): number {
  return Number(value.toFixed(1));
}

export async function getBasketballPlayerDetailByClubSlugHandler(
  ctx: QueryCtx,
  args: {
    clubSlug: string;
    playerId: Id<"players">;
  },
) {
  const { club, accessLevel } = await requireClubAccessBySlug(ctx, args.clubSlug);
  await ensureOrganizationSportType(ctx, club.organizationId, "basketball");

  const player = await ctx.db.get(args.playerId);
  if (!player || player.clubId !== club._id || player.sportType !== "basketball") {
    return null;
  }

  const category = await ctx.db.get(player.categoryId);
  const playerStats = await listBasketballGamePlayerStatsByPlayer(ctx, player._id);

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
    secondLastName: player.secondLastName,
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
    categoryName: category?.name,
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
}

export async function listBasketballPlayerGameLogHandler(
  ctx: QueryCtx,
  args: {
    playerId: Id<"players">;
    limit?: number;
  },
) {
  await getCurrentUser(ctx);

  const player = await ctx.db.get(args.playerId);
  if (!player || player.sportType !== "basketball") {
    return [];
  }

  const { organization } = await requireClubAccess(ctx, player.clubId);
  await ensureOrganizationSportType(ctx, organization._id, "basketball");

  const requestedLimit = Math.floor(args.limit ?? 50);
  const boundedLimit = Math.max(
    1,
    Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 50, 200),
  );

  const stats = await listBasketballGamePlayerStatsByPlayer(ctx, player._id);

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
    .map(({ teamId, opponentId, sortKey: _sortKey, ...row }) => ({
      ...row,
      teamName: clubMap.get(teamId)?.name ?? "Unknown",
      teamNickname: clubMap.get(teamId)?.nickname,
      opponentName: clubMap.get(opponentId)?.name ?? "Unknown",
      opponentNickname: clubMap.get(opponentId)?.nickname,
    }));
}
