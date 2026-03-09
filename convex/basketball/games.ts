import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";
import {
  deleteBasketballGamePlayerStatsByGameAndClub,
  insertBasketballGamePlayerStat,
  listBasketballGamePlayerStatsByGame,
} from "../lib/basketballGamePlayerStats";
import { loadClubsWithLogos } from "../lib/clubLogos";
import {
  requireGameAccess,
  requireGameAdminAccess,
} from "../lib/gamePermissions";
import { requireOrgAccess } from "../lib/permissions";
import { ensureOrganizationSportType } from "../lib/sports";

type PermissionCtx = QueryCtx | MutationCtx;

function roundToSingleDecimal(value: number): number {
  return Number(value.toFixed(1));
}

function topByMetric<T>(
  items: Array<T>,
  getValue: (item: T) => number,
  limit: number,
): Array<T> {
  return [...items]
    .sort((a, b) => {
      const diff = getValue(b) - getValue(a);
      if (diff !== 0) {
        return diff;
      }
      return 0;
    })
    .slice(0, limit);
}

function calculatePercentage(made: number, attempted: number): number {
  if (attempted <= 0) {
    return 0;
  }
  return roundToSingleDecimal((made / attempted) * 100);
}

async function ensureBasketballOrganization(
  ctx: PermissionCtx,
  organizationId: Id<"organizations">,
) {
  await ensureOrganizationSportType(ctx, organizationId, "basketball");
}

async function ensureBasketballGame(
  ctx: PermissionCtx,
  game: { organizationId: Id<"organizations"> },
) {
  await ensureBasketballOrganization(ctx, game.organizationId);
}

type SeasonPlayerLeader = {
  playerId: Id<"players">;
  playerName: string;
  photoUrl?: string;
  clubId: Id<"clubs">;
  clubName: string;
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
};

type SeasonTeamLeader = {
  clubId: Id<"clubs">;
  clubName: string;
  gamesPlayed: number;
  statGamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointsForPerGame: number;
  pointsAllowedPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
};

type SeasonPlayerStatsRow = {
  playerId: Id<"players">;
  playerName: string;
  photoUrl?: string;
  clubId: Id<"clubs">;
  clubName: string;
  clubNickname?: string;
  gamesPlayed: number;
  starts: number;
  minutes: number;
  minutesPerGame: number;
  points: number;
  pointsPerGame: number;
  rebounds: number;
  reboundsPerGame: number;
  assists: number;
  assistsPerGame: number;
  steals: number;
  stealsPerGame: number;
  blocks: number;
  blocksPerGame: number;
  turnovers: number;
  turnoversPerGame: number;
  personalFouls: number;
  personalFoulsPerGame: number;
  plusMinus: number;
  plusMinusPerGame: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fgPct: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePct: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  ftPct: number;
};

type SeasonTeamStatsRow = {
  clubId: Id<"clubs">;
  clubName: string;
  clubNickname?: string;
  clubLogoUrl?: string;
  gamesPlayed: number;
  statGamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsForPerGame: number;
  pointsAllowedPerGame: number;
  rebounds: number;
  reboundsPerGame: number;
  assists: number;
  assistsPerGame: number;
  steals: number;
  stealsPerGame: number;
  blocks: number;
  blocksPerGame: number;
  turnovers: number;
  turnoversPerGame: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fgPct: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePct: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  ftPct: number;
};

type SeasonPlayerLeaders = {
  pointsPerGame: Array<SeasonPlayerLeader>;
  reboundsPerGame: Array<SeasonPlayerLeader>;
  assistsPerGame: Array<SeasonPlayerLeader>;
  stealsPerGame: Array<SeasonPlayerLeader>;
  blocksPerGame: Array<SeasonPlayerLeader>;
};

type SeasonTeamLeaders = {
  pointsForPerGame: Array<SeasonTeamLeader>;
  pointsAllowedPerGame: Array<SeasonTeamLeader>;
  reboundsPerGame: Array<SeasonTeamLeader>;
  assistsPerGame: Array<SeasonTeamLeader>;
  winPct: Array<SeasonTeamLeader>;
};

type SeasonStatsAggregate = {
  season: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  gamesCount: number;
  playerRows: Array<SeasonPlayerStatsRow>;
  teamRows: Array<SeasonTeamStatsRow>;
};

async function buildSeasonStatsAggregate(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  seasonId: string,
): Promise<SeasonStatsAggregate> {
  await ensureBasketballOrganization(ctx, organizationId);

  const settings = await ctx.db
    .query("leagueSettings")
    .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
    .unique();

  const season = (settings?.seasons ?? []).find((item) => item.id === seasonId);
  if (!season) {
    throw new Error("Season not found");
  }

  const seasonGames = await ctx.db
    .query("games")
    .withIndex("byOrganizationAndSeason", (q) =>
      q.eq("organizationId", organizationId).eq("seasonId", seasonId),
    )
    .collect();

  const completedGames = seasonGames.filter(
    (game) =>
      game.status === "completed" &&
      typeof game.homeScore === "number" &&
      typeof game.awayScore === "number",
  );

  if (completedGames.length === 0) {
    return {
      season,
      gamesCount: 0,
      playerRows: [],
      teamRows: [],
    };
  }

  type PlayerSeasonAggregate = {
    playerId: Id<"players">;
    clubId: Id<"clubs">;
    gamesPlayed: number;
    starts: number;
    minutes: number;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    personalFouls: number;
    plusMinus: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
  };

  type TeamSeasonAggregate = {
    clubId: Id<"clubs">;
    gamesPlayed: number;
    statGamesPlayed: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
  };

  type TeamSingleGameTotals = {
    entries: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
  };

  const playerAggregates = new Map<Id<"players">, PlayerSeasonAggregate>();
  const teamAggregates = new Map<Id<"clubs">, TeamSeasonAggregate>();

  const getOrCreateTeamAggregate = (
    clubId: Id<"clubs">,
  ): TeamSeasonAggregate => {
    const existing = teamAggregates.get(clubId);
    if (existing) {
      return existing;
    }

    const created: TeamSeasonAggregate = {
      clubId,
      gamesPlayed: 0,
      statGamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
    };
    teamAggregates.set(clubId, created);
    return created;
  };

  const allGameStats = await Promise.all(
    completedGames.map((game) =>
      listBasketballGamePlayerStatsByGame(ctx, game._id),
    ),
  );

  for (let index = 0; index < completedGames.length; index += 1) {
    const game = completedGames[index];
    const gameStats = allGameStats[index];
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;

    const homeTeamAggregate = getOrCreateTeamAggregate(game.homeClubId);
    const awayTeamAggregate = getOrCreateTeamAggregate(game.awayClubId);

    homeTeamAggregate.gamesPlayed += 1;
    awayTeamAggregate.gamesPlayed += 1;
    homeTeamAggregate.pointsFor += homeScore;
    homeTeamAggregate.pointsAgainst += awayScore;
    awayTeamAggregate.pointsFor += awayScore;
    awayTeamAggregate.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeTeamAggregate.wins += 1;
      awayTeamAggregate.losses += 1;
    } else if (awayScore > homeScore) {
      awayTeamAggregate.wins += 1;
      homeTeamAggregate.losses += 1;
    }

    const teamSingleGameTotals = new Map<Id<"clubs">, TeamSingleGameTotals>();

    for (const stat of gameStats) {
      const minutes = stat.minutes ?? 0;
      const points = stat.points ?? 0;
      const rebounds =
        (stat.offensiveRebounds ?? 0) + (stat.defensiveRebounds ?? 0);
      const assists = stat.assists ?? 0;
      const steals = stat.steals ?? 0;
      const blocks = stat.blocks ?? 0;
      const turnovers = stat.turnovers ?? 0;
      const personalFouls = stat.personalFouls ?? 0;
      const plusMinus = stat.plusMinus ?? 0;
      const fieldGoalsMade = stat.fieldGoalsMade ?? 0;
      const fieldGoalsAttempted = stat.fieldGoalsAttempted ?? 0;
      const threePointersMade = stat.threePointersMade ?? 0;
      const threePointersAttempted = stat.threePointersAttempted ?? 0;
      const freeThrowsMade = stat.freeThrowsMade ?? 0;
      const freeThrowsAttempted = stat.freeThrowsAttempted ?? 0;

      const playerAggregate = playerAggregates.get(stat.playerId);
      if (playerAggregate) {
        playerAggregate.gamesPlayed += 1;
        playerAggregate.starts += stat.isStarter ? 1 : 0;
        playerAggregate.minutes += minutes;
        playerAggregate.points += points;
        playerAggregate.rebounds += rebounds;
        playerAggregate.assists += assists;
        playerAggregate.steals += steals;
        playerAggregate.blocks += blocks;
        playerAggregate.turnovers += turnovers;
        playerAggregate.personalFouls += personalFouls;
        playerAggregate.plusMinus += plusMinus;
        playerAggregate.fieldGoalsMade += fieldGoalsMade;
        playerAggregate.fieldGoalsAttempted += fieldGoalsAttempted;
        playerAggregate.threePointersMade += threePointersMade;
        playerAggregate.threePointersAttempted += threePointersAttempted;
        playerAggregate.freeThrowsMade += freeThrowsMade;
        playerAggregate.freeThrowsAttempted += freeThrowsAttempted;
      } else {
        playerAggregates.set(stat.playerId, {
          playerId: stat.playerId,
          clubId: stat.clubId,
          gamesPlayed: 1,
          starts: stat.isStarter ? 1 : 0,
          minutes,
          points,
          rebounds,
          assists,
          steals,
          blocks,
          turnovers,
          personalFouls,
          plusMinus,
          fieldGoalsMade,
          fieldGoalsAttempted,
          threePointersMade,
          threePointersAttempted,
          freeThrowsMade,
          freeThrowsAttempted,
        });
      }

      const teamGameTotals = teamSingleGameTotals.get(stat.clubId);
      if (teamGameTotals) {
        teamGameTotals.entries += 1;
        teamGameTotals.rebounds += rebounds;
        teamGameTotals.assists += assists;
        teamGameTotals.steals += steals;
        teamGameTotals.blocks += blocks;
        teamGameTotals.turnovers += turnovers;
        teamGameTotals.fieldGoalsMade += fieldGoalsMade;
        teamGameTotals.fieldGoalsAttempted += fieldGoalsAttempted;
        teamGameTotals.threePointersMade += threePointersMade;
        teamGameTotals.threePointersAttempted += threePointersAttempted;
        teamGameTotals.freeThrowsMade += freeThrowsMade;
        teamGameTotals.freeThrowsAttempted += freeThrowsAttempted;
      } else {
        teamSingleGameTotals.set(stat.clubId, {
          entries: 1,
          rebounds,
          assists,
          steals,
          blocks,
          turnovers,
          fieldGoalsMade,
          fieldGoalsAttempted,
          threePointersMade,
          threePointersAttempted,
          freeThrowsMade,
          freeThrowsAttempted,
        });
      }
    }

    for (const [clubId, totals] of teamSingleGameTotals) {
      const teamAggregate = teamAggregates.get(clubId);
      if (!teamAggregate || totals.entries === 0) {
        continue;
      }
      teamAggregate.statGamesPlayed += 1;
      teamAggregate.rebounds += totals.rebounds;
      teamAggregate.assists += totals.assists;
      teamAggregate.steals += totals.steals;
      teamAggregate.blocks += totals.blocks;
      teamAggregate.turnovers += totals.turnovers;
      teamAggregate.fieldGoalsMade += totals.fieldGoalsMade;
      teamAggregate.fieldGoalsAttempted += totals.fieldGoalsAttempted;
      teamAggregate.threePointersMade += totals.threePointersMade;
      teamAggregate.threePointersAttempted += totals.threePointersAttempted;
      teamAggregate.freeThrowsMade += totals.freeThrowsMade;
      teamAggregate.freeThrowsAttempted += totals.freeThrowsAttempted;
    }
  }

  const clubIds = new Set<Id<"clubs">>();
  for (const clubId of teamAggregates.keys()) {
    clubIds.add(clubId);
  }
  for (const playerAggregate of playerAggregates.values()) {
    clubIds.add(playerAggregate.clubId);
  }

  const { clubMap, clubLogoMap } = await loadClubsWithLogos(
    ctx,
    Array.from(clubIds),
  );

  const playerIds = Array.from(playerAggregates.keys());
  const players = await Promise.all(playerIds.map((id) => ctx.db.get(id)));
  const playerMap = new Map(
    players
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .map((player) => [player._id, player]),
  );

  const photoEntries = await Promise.all(
    players
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .map(async (player) => {
        const photoUrl = player.photoStorageId
          ? ((await ctx.storage.getUrl(player.photoStorageId)) ?? undefined)
          : undefined;
        return [player._id, photoUrl] as const;
      }),
  );
  const playerPhotoMap = new Map(photoEntries);

  const playerRows = Array.from(playerAggregates.values())
    .map((aggregate) => {
      const player = playerMap.get(aggregate.playerId);
      const club = clubMap.get(aggregate.clubId);
      if (!player || !club || aggregate.gamesPlayed === 0) {
        return null;
      }

      const gamesPlayed = aggregate.gamesPlayed;

      return {
        playerId: aggregate.playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        photoUrl: playerPhotoMap.get(aggregate.playerId),
        clubId: aggregate.clubId,
        clubName: club.name,
        clubNickname: club.nickname,
        gamesPlayed,
        starts: aggregate.starts,
        minutes: aggregate.minutes,
        minutesPerGame: roundToSingleDecimal(aggregate.minutes / gamesPlayed),
        points: aggregate.points,
        pointsPerGame: roundToSingleDecimal(aggregate.points / gamesPlayed),
        rebounds: aggregate.rebounds,
        reboundsPerGame: roundToSingleDecimal(aggregate.rebounds / gamesPlayed),
        assists: aggregate.assists,
        assistsPerGame: roundToSingleDecimal(aggregate.assists / gamesPlayed),
        steals: aggregate.steals,
        stealsPerGame: roundToSingleDecimal(aggregate.steals / gamesPlayed),
        blocks: aggregate.blocks,
        blocksPerGame: roundToSingleDecimal(aggregate.blocks / gamesPlayed),
        turnovers: aggregate.turnovers,
        turnoversPerGame: roundToSingleDecimal(
          aggregate.turnovers / gamesPlayed,
        ),
        personalFouls: aggregate.personalFouls,
        personalFoulsPerGame: roundToSingleDecimal(
          aggregate.personalFouls / gamesPlayed,
        ),
        plusMinus: aggregate.plusMinus,
        plusMinusPerGame: roundToSingleDecimal(
          aggregate.plusMinus / gamesPlayed,
        ),
        fieldGoalsMade: aggregate.fieldGoalsMade,
        fieldGoalsAttempted: aggregate.fieldGoalsAttempted,
        fgPct: calculatePercentage(
          aggregate.fieldGoalsMade,
          aggregate.fieldGoalsAttempted,
        ),
        threePointersMade: aggregate.threePointersMade,
        threePointersAttempted: aggregate.threePointersAttempted,
        threePct: calculatePercentage(
          aggregate.threePointersMade,
          aggregate.threePointersAttempted,
        ),
        freeThrowsMade: aggregate.freeThrowsMade,
        freeThrowsAttempted: aggregate.freeThrowsAttempted,
        ftPct: calculatePercentage(
          aggregate.freeThrowsMade,
          aggregate.freeThrowsAttempted,
        ),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const teamRows = Array.from(teamAggregates.values())
    .map((aggregate) => {
      const club = clubMap.get(aggregate.clubId);
      if (!club || aggregate.gamesPlayed === 0) {
        return null;
      }

      const gamesPlayed = aggregate.gamesPlayed;
      const statGames = aggregate.statGamesPlayed || 0;

      return {
        clubId: aggregate.clubId,
        clubName: club.name,
        clubNickname: club.nickname,
        clubLogoUrl: clubLogoMap.get(aggregate.clubId),
        gamesPlayed,
        statGamesPlayed: statGames,
        wins: aggregate.wins,
        losses: aggregate.losses,
        winPct: roundToSingleDecimal((aggregate.wins / gamesPlayed) * 100),
        pointsFor: aggregate.pointsFor,
        pointsAgainst: aggregate.pointsAgainst,
        pointsForPerGame: roundToSingleDecimal(
          aggregate.pointsFor / gamesPlayed,
        ),
        pointsAllowedPerGame: roundToSingleDecimal(
          aggregate.pointsAgainst / gamesPlayed,
        ),
        rebounds: aggregate.rebounds,
        reboundsPerGame: statGames
          ? roundToSingleDecimal(aggregate.rebounds / statGames)
          : 0,
        assists: aggregate.assists,
        assistsPerGame: statGames
          ? roundToSingleDecimal(aggregate.assists / statGames)
          : 0,
        steals: aggregate.steals,
        stealsPerGame: statGames
          ? roundToSingleDecimal(aggregate.steals / statGames)
          : 0,
        blocks: aggregate.blocks,
        blocksPerGame: statGames
          ? roundToSingleDecimal(aggregate.blocks / statGames)
          : 0,
        turnovers: aggregate.turnovers,
        turnoversPerGame: statGames
          ? roundToSingleDecimal(aggregate.turnovers / statGames)
          : 0,
        fieldGoalsMade: aggregate.fieldGoalsMade,
        fieldGoalsAttempted: aggregate.fieldGoalsAttempted,
        fgPct: calculatePercentage(
          aggregate.fieldGoalsMade,
          aggregate.fieldGoalsAttempted,
        ),
        threePointersMade: aggregate.threePointersMade,
        threePointersAttempted: aggregate.threePointersAttempted,
        threePct: calculatePercentage(
          aggregate.threePointersMade,
          aggregate.threePointersAttempted,
        ),
        freeThrowsMade: aggregate.freeThrowsMade,
        freeThrowsAttempted: aggregate.freeThrowsAttempted,
        ftPct: calculatePercentage(
          aggregate.freeThrowsMade,
          aggregate.freeThrowsAttempted,
        ),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    season,
    gamesCount: completedGames.length,
    playerRows,
    teamRows,
  };
}

export async function getGamePlayerStatsHandler(
  ctx: QueryCtx,
  args: { gameId: Id<"games"> },
) {
  const game = await ctx.db.get(args.gameId);
  if (!game) {
    return { homeStats: [], awayStats: [] };
  }

  await requireGameAccess(ctx, game);
  await ensureBasketballGame(ctx, game);

  const allStats = await listBasketballGamePlayerStatsByGame(ctx, args.gameId);

  const playerIds = [...new Set(allStats.map((s) => s.playerId))];
  const players = await Promise.all(playerIds.map((id) => ctx.db.get(id)));
  const playerMap = new Map(players.filter(Boolean).map((p) => [p!._id, p!]));

  const photoUrls = new Map<string, string>();
  for (const player of players.filter(Boolean)) {
    if (player!.photoStorageId) {
      const url = await ctx.storage.getUrl(player!.photoStorageId);
      if (url) {
        photoUrls.set(player!._id, url);
      }
    }
  }

  const mapStats = (stats: typeof allStats) =>
    stats.map((s) => {
      const player = playerMap.get(s.playerId);
      return {
        _id: s._id,
        playerId: s.playerId,
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : "Unknown",
        jerseyNumber: player?.jerseyNumber,
        photoUrl: photoUrls.get(s.playerId),
        clubId: s.clubId,
        isStarter: s.isStarter,
        minutes: s.minutes,
        points: s.points,
        fieldGoalsMade: s.fieldGoalsMade,
        fieldGoalsAttempted: s.fieldGoalsAttempted,
        threePointersMade: s.threePointersMade,
        threePointersAttempted: s.threePointersAttempted,
        freeThrowsMade: s.freeThrowsMade,
        freeThrowsAttempted: s.freeThrowsAttempted,
        offensiveRebounds: s.offensiveRebounds,
        defensiveRebounds: s.defensiveRebounds,
        assists: s.assists,
        steals: s.steals,
        blocks: s.blocks,
        turnovers: s.turnovers,
        personalFouls: s.personalFouls,
        plusMinus: s.plusMinus,
      };
    });

  const homeStats = mapStats(
    allStats.filter((s) => s.clubId === game.homeClubId),
  );
  const awayStats = mapStats(
    allStats.filter((s) => s.clubId === game.awayClubId),
  );

  return { homeStats, awayStats };
}

export async function getSeasonLeadersHandler(
  ctx: QueryCtx,
  args: {
    orgSlug: string;
    seasonId: string;
    limit?: number;
  },
) {
  const { organization } = await requireOrgAccess(ctx, args.orgSlug);
  const rawLimit = Math.floor(args.limit ?? 10);
  const leaderLimit = Math.max(1, Math.min(20, rawLimit));

  const seasonStats = await buildSeasonStatsAggregate(
    ctx,
    organization._id,
    args.seasonId,
  );

  const season = seasonStats.season;

  const emptyPlayerLeaders: SeasonPlayerLeaders = {
    pointsPerGame: [],
    reboundsPerGame: [],
    assistsPerGame: [],
    stealsPerGame: [],
    blocksPerGame: [],
  };

  const emptyTeamLeaders: SeasonTeamLeaders = {
    pointsForPerGame: [],
    pointsAllowedPerGame: [],
    reboundsPerGame: [],
    assistsPerGame: [],
    winPct: [],
  };

  if (seasonStats.gamesCount === 0) {
    return {
      season,
      gamesCount: 0,
      leaderLimit,
      playerLeaders: emptyPlayerLeaders,
      teamLeaders: emptyTeamLeaders,
    };
  }

  const playerLeaderRows: Array<SeasonPlayerLeader> =
    seasonStats.playerRows.map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      photoUrl: row.photoUrl,
      clubId: row.clubId,
      clubName: row.clubName,
      gamesPlayed: row.gamesPlayed,
      points: row.points,
      rebounds: row.rebounds,
      assists: row.assists,
      steals: row.steals,
      blocks: row.blocks,
      pointsPerGame: row.pointsPerGame,
      reboundsPerGame: row.reboundsPerGame,
      assistsPerGame: row.assistsPerGame,
      stealsPerGame: row.stealsPerGame,
      blocksPerGame: row.blocksPerGame,
    }));

  const teamLeaderRows: Array<SeasonTeamLeader> = seasonStats.teamRows.map(
    (row) => ({
      clubId: row.clubId,
      clubName: row.clubName,
      gamesPlayed: row.gamesPlayed,
      statGamesPlayed: row.statGamesPlayed,
      wins: row.wins,
      losses: row.losses,
      winPct: row.winPct,
      pointsForPerGame: row.pointsForPerGame,
      pointsAllowedPerGame: row.pointsAllowedPerGame,
      reboundsPerGame: row.reboundsPerGame,
      assistsPerGame: row.assistsPerGame,
      stealsPerGame: row.stealsPerGame,
      blocksPerGame: row.blocksPerGame,
    }),
  );

  return {
    season,
    gamesCount: seasonStats.gamesCount,
    leaderLimit,
    playerLeaders: {
      pointsPerGame: topByMetric(
        playerLeaderRows,
        (item) => item.pointsPerGame,
        leaderLimit,
      ),
      reboundsPerGame: topByMetric(
        playerLeaderRows,
        (item) => item.reboundsPerGame,
        leaderLimit,
      ),
      assistsPerGame: topByMetric(
        playerLeaderRows,
        (item) => item.assistsPerGame,
        leaderLimit,
      ),
      stealsPerGame: topByMetric(
        playerLeaderRows,
        (item) => item.stealsPerGame,
        leaderLimit,
      ),
      blocksPerGame: topByMetric(
        playerLeaderRows,
        (item) => item.blocksPerGame,
        leaderLimit,
      ),
    },
    teamLeaders: {
      pointsForPerGame: topByMetric(
        teamLeaderRows,
        (item) => item.pointsForPerGame,
        leaderLimit,
      ),
      pointsAllowedPerGame: topByMetric(
        teamLeaderRows,
        (item) => item.pointsAllowedPerGame * -1,
        leaderLimit,
      ),
      reboundsPerGame: topByMetric(
        teamLeaderRows,
        (item) => item.reboundsPerGame,
        leaderLimit,
      ),
      assistsPerGame: topByMetric(
        teamLeaderRows,
        (item) => item.assistsPerGame,
        leaderLimit,
      ),
      winPct: topByMetric(teamLeaderRows, (item) => item.winPct, leaderLimit),
    },
  };
}

export async function getSeasonStatsTableHandler(
  ctx: QueryCtx,
  args: {
    orgSlug: string;
    seasonId: string;
  },
) {
  const { organization } = await requireOrgAccess(ctx, args.orgSlug);
  const seasonStats = await buildSeasonStatsAggregate(
    ctx,
    organization._id,
    args.seasonId,
  );

  return {
    season: seasonStats.season,
    gamesCount: seasonStats.gamesCount,
    players: seasonStats.playerRows,
    teams: seasonStats.teamRows,
  };
}

export async function submitTeamStatsHandler(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    clubId: Id<"clubs">;
    playerStats: Array<{
      playerId: Id<"players">;
      isStarter: boolean;
      minutes?: number;
      points?: number;
      fieldGoalsMade?: number;
      fieldGoalsAttempted?: number;
      threePointersMade?: number;
      threePointersAttempted?: number;
      freeThrowsMade?: number;
      freeThrowsAttempted?: number;
      offensiveRebounds?: number;
      defensiveRebounds?: number;
      assists?: number;
      steals?: number;
      blocks?: number;
      turnovers?: number;
      personalFouls?: number;
      plusMinus?: number;
    }>;
    teamScore: number;
  },
) {
  const user = await getCurrentUser(ctx);

  const game = await ctx.db.get(args.gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  await ensureBasketballGame(ctx, game);

  const isHomeTeam = game.homeClubId === args.clubId;
  const isAwayTeam = game.awayClubId === args.clubId;
  if (!isHomeTeam && !isAwayTeam) {
    throw new Error("Club is not part of this game");
  }

  const staffMember = await ctx.db
    .query("staff")
    .withIndex("byClub", (q) => q.eq("clubId", args.clubId))
    .filter((q) => q.eq(q.field("userId"), user._id))
    .first();

  if (!staffMember && !user.isSuperAdmin) {
    throw new Error("You must be staff of this team to submit stats");
  }

  if (game.status !== "scheduled" && game.status !== "awaiting_stats") {
    throw new Error(
      "Stats can only be submitted when game is scheduled or awaiting stats",
    );
  }

  const gameDateTime = new Date(`${game.date}T${game.startTime}`);
  if (new Date() < gameDateTime) {
    throw new Error("Cannot submit stats before game start time");
  }

  if (isHomeTeam && game.homeStatsSubmittedAt) {
    throw new Error("Home team stats already submitted");
  }
  if (isAwayTeam && game.awayStatsSubmittedAt) {
    throw new Error("Away team stats already submitted");
  }

  for (const stat of args.playerStats) {
    const player = await ctx.db.get(stat.playerId);
    if (
      !player ||
      player.clubId !== args.clubId ||
      player.sportType !== "basketball"
    ) {
      throw new Error(`Player ${stat.playerId} does not belong to this club`);
    }
  }

  await deleteBasketballGamePlayerStatsByGameAndClub(
    ctx,
    args.gameId,
    args.clubId,
  );

  for (const stat of args.playerStats) {
    await insertBasketballGamePlayerStat(ctx, {
      gameId: args.gameId,
      playerId: stat.playerId,
      clubId: args.clubId,
      isStarter: stat.isStarter,
      minutes: stat.minutes,
      points: stat.points,
      fieldGoalsMade: stat.fieldGoalsMade,
      fieldGoalsAttempted: stat.fieldGoalsAttempted,
      threePointersMade: stat.threePointersMade,
      threePointersAttempted: stat.threePointersAttempted,
      freeThrowsMade: stat.freeThrowsMade,
      freeThrowsAttempted: stat.freeThrowsAttempted,
      offensiveRebounds: stat.offensiveRebounds,
      defensiveRebounds: stat.defensiveRebounds,
      assists: stat.assists,
      steals: stat.steals,
      blocks: stat.blocks,
      turnovers: stat.turnovers,
      personalFouls: stat.personalFouls,
      plusMinus: stat.plusMinus,
    });
  }

  const now = Date.now();
  const updates: Record<string, unknown> = {};

  if (isHomeTeam) {
    updates.homeStatsSubmittedAt = now;
    updates.homeScore = args.teamScore;
  } else {
    updates.awayStatsSubmittedAt = now;
    updates.awayScore = args.teamScore;
  }

  const homeSubmitted = isHomeTeam ? true : !!game.homeStatsSubmittedAt;
  const awaySubmitted = isAwayTeam ? true : !!game.awayStatsSubmittedAt;

  if (homeSubmitted && awaySubmitted) {
    updates.status = "pending_review";
  } else {
    updates.status = "awaiting_stats";
  }

  await ctx.db.patch(args.gameId, updates);

  return null;
}

export async function confirmOpponentStatsHandler(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    clubId: Id<"clubs">;
  },
) {
  const user = await getCurrentUser(ctx);

  const game = await ctx.db.get(args.gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  await ensureBasketballGame(ctx, game);

  const isHomeTeam = game.homeClubId === args.clubId;
  const isAwayTeam = game.awayClubId === args.clubId;
  if (!isHomeTeam && !isAwayTeam) {
    throw new Error("Club is not part of this game");
  }

  const staffMember = await ctx.db
    .query("staff")
    .withIndex("byClub", (q) => q.eq("clubId", args.clubId))
    .filter((q) => q.eq(q.field("userId"), user._id))
    .first();

  if (!staffMember && !user.isSuperAdmin) {
    throw new Error("You must be staff of this team to confirm stats");
  }

  if (game.status !== "pending_review") {
    throw new Error("Game must be in pending review status to confirm stats");
  }

  const updates: Record<string, unknown> = {};

  if (isHomeTeam) {
    updates.homeStatsConfirmed = true;
  } else {
    updates.awayStatsConfirmed = true;
  }

  const homeConfirmed = isHomeTeam ? true : !!game.homeStatsConfirmed;
  const awayConfirmed = isAwayTeam ? true : !!game.awayStatsConfirmed;

  if (homeConfirmed && awayConfirmed) {
    updates.status = "completed";
  }

  await ctx.db.patch(args.gameId, updates);

  return null;
}

export async function forceCompleteHandler(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
  },
) {
  const game = await ctx.db.get(args.gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  await requireGameAdminAccess(ctx, game.organizationId);
  await ensureBasketballGame(ctx, game);

  await ctx.db.patch(args.gameId, {
    status: "completed",
    homeStatsConfirmed: true,
    awayStatsConfirmed: true,
  });

  return null;
}
