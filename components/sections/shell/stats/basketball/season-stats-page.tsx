"use client";

import { useEffect, useMemo, useState } from "react";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/data-table";
import {
  COMPACT_STATS_TABLE_CLASS,
  createSeasonPlayerStatsColumns,
  createSeasonPlayerStatsFilterConfigs,
  createSeasonTeamStatsColumns,
  type SeasonPlayerStatsRow,
  type SeasonTeamStatsRow,
} from "@/components/sections/shell/stats/basketball/stats-columns";

interface SeasonStatsPageProps {
  preloadedSeasons: Preloaded<typeof api.leagueSettings.listSeasons>;
  orgSlug: string;
}

type PlayerMetricKey =
  | "pointsPerGame"
  | "reboundsPerGame"
  | "assistsPerGame"
  | "stealsPerGame"
  | "blocksPerGame";

type TeamMetricKey =
  | "pointsForPerGame"
  | "pointsAllowedPerGame"
  | "reboundsPerGame"
  | "assistsPerGame"
  | "winPct";

type StatsTab = "home" | "players" | "teams";

const VALID_STATS_TABS: StatsTab[] = ["home", "players", "teams"];
const DEFAULT_TAB: StatsTab = "home";

const DEMO_SEASON = {
  id: "demo-season",
  name: "Season Demo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
};

const DEMO_PLAYER_ROWS: SeasonPlayerStatsRow[] = [
  {
    playerId: "demo-player-1",
    playerName: "Luka Doncic",
    photoUrl: undefined,
    clubId: "demo-club-1",
    clubName: "Mavericks",
    gamesPlayed: 12,
    starts: 12,
    minutes: 435,
    minutesPerGame: 36.3,
    points: 394,
    pointsPerGame: 32.8,
    rebounds: 118,
    reboundsPerGame: 9.8,
    assists: 106,
    assistsPerGame: 8.8,
    steals: 19,
    stealsPerGame: 1.6,
    blocks: 8,
    blocksPerGame: 0.7,
    turnovers: 41,
    turnoversPerGame: 3.4,
    personalFouls: 26,
    personalFoulsPerGame: 2.2,
    plusMinus: 112,
    plusMinusPerGame: 9.3,
    fieldGoalsMade: 139,
    fieldGoalsAttempted: 278,
    fgPct: 50.0,
    threePointersMade: 51,
    threePointersAttempted: 126,
    threePct: 40.5,
    freeThrowsMade: 65,
    freeThrowsAttempted: 79,
    ftPct: 82.3,
  },
  {
    playerId: "demo-player-2",
    playerName: "Shai Gilgeous-Alexander",
    photoUrl: undefined,
    clubId: "demo-club-2",
    clubName: "Thunder",
    gamesPlayed: 12,
    starts: 12,
    minutes: 418,
    minutesPerGame: 34.8,
    points: 365,
    pointsPerGame: 30.4,
    rebounds: 69,
    reboundsPerGame: 5.8,
    assists: 84,
    assistsPerGame: 7.0,
    steals: 25,
    stealsPerGame: 2.1,
    blocks: 11,
    blocksPerGame: 0.9,
    turnovers: 29,
    turnoversPerGame: 2.4,
    personalFouls: 24,
    personalFoulsPerGame: 2.0,
    plusMinus: 89,
    plusMinusPerGame: 7.4,
    fieldGoalsMade: 127,
    fieldGoalsAttempted: 236,
    fgPct: 53.8,
    threePointersMade: 22,
    threePointersAttempted: 62,
    threePct: 35.5,
    freeThrowsMade: 89,
    freeThrowsAttempted: 98,
    ftPct: 90.8,
  },
  {
    playerId: "demo-player-3",
    playerName: "Nikola Jokic",
    photoUrl: undefined,
    clubId: "demo-club-3",
    clubName: "Nuggets",
    gamesPlayed: 12,
    starts: 12,
    minutes: 411,
    minutesPerGame: 34.3,
    points: 344,
    pointsPerGame: 28.7,
    rebounds: 149,
    reboundsPerGame: 12.4,
    assists: 121,
    assistsPerGame: 10.1,
    steals: 18,
    stealsPerGame: 1.5,
    blocks: 9,
    blocksPerGame: 0.8,
    turnovers: 34,
    turnoversPerGame: 2.8,
    personalFouls: 27,
    personalFoulsPerGame: 2.3,
    plusMinus: 105,
    plusMinusPerGame: 8.8,
    fieldGoalsMade: 132,
    fieldGoalsAttempted: 233,
    fgPct: 56.7,
    threePointersMade: 19,
    threePointersAttempted: 52,
    threePct: 36.5,
    freeThrowsMade: 61,
    freeThrowsAttempted: 71,
    ftPct: 85.9,
  },
  {
    playerId: "demo-player-4",
    playerName: "Jayson Tatum",
    photoUrl: undefined,
    clubId: "demo-club-4",
    clubName: "Celtics",
    gamesPlayed: 12,
    starts: 12,
    minutes: 422,
    minutesPerGame: 35.2,
    points: 334,
    pointsPerGame: 27.8,
    rebounds: 102,
    reboundsPerGame: 8.5,
    assists: 66,
    assistsPerGame: 5.5,
    steals: 16,
    stealsPerGame: 1.3,
    blocks: 10,
    blocksPerGame: 0.8,
    turnovers: 33,
    turnoversPerGame: 2.8,
    personalFouls: 25,
    personalFoulsPerGame: 2.1,
    plusMinus: 78,
    plusMinusPerGame: 6.5,
    fieldGoalsMade: 120,
    fieldGoalsAttempted: 256,
    fgPct: 46.9,
    threePointersMade: 44,
    threePointersAttempted: 115,
    threePct: 38.3,
    freeThrowsMade: 50,
    freeThrowsAttempted: 58,
    ftPct: 86.2,
  },
  {
    playerId: "demo-player-5",
    playerName: "Victor Wembanyama",
    photoUrl: undefined,
    clubId: "demo-club-5",
    clubName: "Spurs",
    gamesPlayed: 12,
    starts: 12,
    minutes: 383,
    minutesPerGame: 31.9,
    points: 301,
    pointsPerGame: 25.1,
    rebounds: 130,
    reboundsPerGame: 10.8,
    assists: 50,
    assistsPerGame: 4.2,
    steals: 17,
    stealsPerGame: 1.4,
    blocks: 35,
    blocksPerGame: 2.9,
    turnovers: 30,
    turnoversPerGame: 2.5,
    personalFouls: 29,
    personalFoulsPerGame: 2.4,
    plusMinus: 31,
    plusMinusPerGame: 2.6,
    fieldGoalsMade: 108,
    fieldGoalsAttempted: 219,
    fgPct: 49.3,
    threePointersMade: 25,
    threePointersAttempted: 84,
    threePct: 29.8,
    freeThrowsMade: 60,
    freeThrowsAttempted: 73,
    ftPct: 82.2,
  },
];

const DEMO_TEAM_ROWS: SeasonTeamStatsRow[] = [
  {
    clubId: "demo-club-4",
    clubName: "Celtics",
    gamesPlayed: 12,
    statGamesPlayed: 12,
    wins: 10,
    losses: 2,
    winPct: 83.3,
    pointsFor: 1452,
    pointsAgainst: 1271,
    pointsForPerGame: 121.0,
    pointsAllowedPerGame: 105.9,
    rebounds: 552,
    reboundsPerGame: 46.0,
    assists: 362,
    assistsPerGame: 30.2,
    steals: 94,
    stealsPerGame: 7.8,
    blocks: 68,
    blocksPerGame: 5.7,
    turnovers: 144,
    turnoversPerGame: 12.0,
    fieldGoalsMade: 534,
    fieldGoalsAttempted: 1054,
    fgPct: 50.7,
    threePointersMade: 198,
    threePointersAttempted: 495,
    threePct: 40.0,
    freeThrowsMade: 186,
    freeThrowsAttempted: 221,
    ftPct: 84.2,
  },
  {
    clubId: "demo-club-3",
    clubName: "Nuggets",
    gamesPlayed: 12,
    statGamesPlayed: 12,
    wins: 9,
    losses: 3,
    winPct: 75.0,
    pointsFor: 1420,
    pointsAgainst: 1310,
    pointsForPerGame: 118.3,
    pointsAllowedPerGame: 109.2,
    rebounds: 567,
    reboundsPerGame: 47.3,
    assists: 360,
    assistsPerGame: 30.0,
    steals: 82,
    stealsPerGame: 6.8,
    blocks: 63,
    blocksPerGame: 5.3,
    turnovers: 150,
    turnoversPerGame: 12.5,
    fieldGoalsMade: 521,
    fieldGoalsAttempted: 1031,
    fgPct: 50.5,
    threePointersMade: 164,
    threePointersAttempted: 429,
    threePct: 38.2,
    freeThrowsMade: 214,
    freeThrowsAttempted: 255,
    ftPct: 83.9,
  },
  {
    clubId: "demo-club-1",
    clubName: "Mavericks",
    gamesPlayed: 12,
    statGamesPlayed: 12,
    wins: 8,
    losses: 4,
    winPct: 66.7,
    pointsFor: 1462,
    pointsAgainst: 1384,
    pointsForPerGame: 121.8,
    pointsAllowedPerGame: 115.3,
    rebounds: 540,
    reboundsPerGame: 45.0,
    assists: 349,
    assistsPerGame: 29.1,
    steals: 88,
    stealsPerGame: 7.3,
    blocks: 61,
    blocksPerGame: 5.1,
    turnovers: 155,
    turnoversPerGame: 12.9,
    fieldGoalsMade: 531,
    fieldGoalsAttempted: 1062,
    fgPct: 50.0,
    threePointersMade: 207,
    threePointersAttempted: 524,
    threePct: 39.5,
    freeThrowsMade: 193,
    freeThrowsAttempted: 236,
    ftPct: 81.8,
  },
  {
    clubId: "demo-club-2",
    clubName: "Thunder",
    gamesPlayed: 12,
    statGamesPlayed: 12,
    wins: 8,
    losses: 4,
    winPct: 66.7,
    pointsFor: 1406,
    pointsAgainst: 1318,
    pointsForPerGame: 117.2,
    pointsAllowedPerGame: 109.8,
    rebounds: 522,
    reboundsPerGame: 43.5,
    assists: 341,
    assistsPerGame: 28.4,
    steals: 117,
    stealsPerGame: 9.8,
    blocks: 73,
    blocksPerGame: 6.1,
    turnovers: 158,
    turnoversPerGame: 13.2,
    fieldGoalsMade: 506,
    fieldGoalsAttempted: 1029,
    fgPct: 49.2,
    threePointersMade: 176,
    threePointersAttempted: 461,
    threePct: 38.2,
    freeThrowsMade: 218,
    freeThrowsAttempted: 258,
    ftPct: 84.5,
  },
  {
    clubId: "demo-club-5",
    clubName: "Spurs",
    gamesPlayed: 12,
    statGamesPlayed: 12,
    wins: 5,
    losses: 7,
    winPct: 41.7,
    pointsFor: 1363,
    pointsAgainst: 1429,
    pointsForPerGame: 113.6,
    pointsAllowedPerGame: 119.1,
    rebounds: 536,
    reboundsPerGame: 44.7,
    assists: 311,
    assistsPerGame: 25.9,
    steals: 87,
    stealsPerGame: 7.3,
    blocks: 76,
    blocksPerGame: 6.3,
    turnovers: 167,
    turnoversPerGame: 13.9,
    fieldGoalsMade: 499,
    fieldGoalsAttempted: 1057,
    fgPct: 47.2,
    threePointersMade: 172,
    threePointersAttempted: 486,
    threePct: 35.4,
    freeThrowsMade: 193,
    freeThrowsAttempted: 248,
    ftPct: 77.8,
  },
];

function isStatsTab(value: string | null): value is StatsTab {
  return value !== null && VALID_STATS_TABS.includes(value as StatsTab);
}

function formatOneDecimal(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function topByMetric<T>(
  rows: Array<T>,
  getValue: (row: T) => number,
  limit = 5,
): Array<T> {
  return [...rows]
    .sort((a, b) => {
      const diff = getValue(b) - getValue(a);
      if (diff !== 0) {
        return diff;
      }
      return 0;
    })
    .slice(0, limit);
}

const DEMO_LEADERS = {
  season: DEMO_SEASON,
  gamesCount: 12,
  leaderLimit: 5,
  playerLeaders: {
    pointsPerGame: topByMetric(DEMO_PLAYER_ROWS, (row) => row.pointsPerGame),
    reboundsPerGame: topByMetric(
      DEMO_PLAYER_ROWS,
      (row) => row.reboundsPerGame,
    ),
    assistsPerGame: topByMetric(DEMO_PLAYER_ROWS, (row) => row.assistsPerGame),
    stealsPerGame: topByMetric(DEMO_PLAYER_ROWS, (row) => row.stealsPerGame),
    blocksPerGame: topByMetric(DEMO_PLAYER_ROWS, (row) => row.blocksPerGame),
  },
  teamLeaders: {
    pointsForPerGame: topByMetric(
      DEMO_TEAM_ROWS,
      (row) => row.pointsForPerGame,
    ),
    pointsAllowedPerGame: topByMetric(
      DEMO_TEAM_ROWS,
      (row) => row.pointsAllowedPerGame * -1,
    ),
    reboundsPerGame: topByMetric(DEMO_TEAM_ROWS, (row) => row.reboundsPerGame),
    assistsPerGame: topByMetric(DEMO_TEAM_ROWS, (row) => row.assistsPerGame),
    winPct: topByMetric(DEMO_TEAM_ROWS, (row) => row.winPct),
  },
};

const DEMO_SEASON_TABLE = {
  season: DEMO_SEASON,
  gamesCount: 12,
  players: DEMO_PLAYER_ROWS,
  teams: DEMO_TEAM_ROWS,
};

function PlayerLeadersCard({
  title,
  rows,
  metricKey,
}: {
  title: string;
  rows: Array<{
    playerId: string;
    playerName: string;
    clubName: string;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
  }>;
  metricKey: PlayerMetricKey;
}) {
  return (
    <article className="border-t pt-3">
      <h3 className="text-primary text-base font-extrabold uppercase tracking-wide">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {rows.map((row, index) => (
            <li
              key={row.playerId}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0 text-base">
                <span className="font-semibold">
                  {index + 1}. {row.playerName}
                </span>{" "}
                <span className="text-muted-foreground text-sm">
                  {row.clubName}
                </span>
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">
                {formatOneDecimal(row[metricKey])}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function TeamLeadersCard({
  title,
  rows,
  metricKey,
  isPercent,
}: {
  title: string;
  rows: Array<{
    clubId: string;
    clubName: string;
    pointsForPerGame: number;
    pointsAllowedPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    winPct: number;
  }>;
  metricKey: TeamMetricKey;
  isPercent?: boolean;
}) {
  return (
    <article className="border-t pt-3">
      <h3 className="text-primary text-base font-extrabold uppercase tracking-wide">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {rows.map((row, index) => (
            <li
              key={row.clubId}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0 text-base">
                <span className="font-semibold">
                  {index + 1}. {row.clubName}
                </span>
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">
                {formatOneDecimal(row[metricKey])}
                {isPercent ? "%" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function SeasonStatsPage({
  preloadedSeasons,
  orgSlug,
}: SeasonStatsPageProps) {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: StatsTab = isStatsTab(rawTab) ? rawTab : DEFAULT_TAB;
  const isDemoMode = searchParams.get("demo") === "1";

  const seasons = usePreloadedQuery(preloadedSeasons);
  const availableSeasons = useMemo(
    () => (isDemoMode && seasons.length === 0 ? [DEMO_SEASON] : seasons),
    [isDemoMode, seasons],
  );

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    () => availableSeasons[0]?.id ?? "",
  );

  useEffect(() => {
    if (availableSeasons.length === 0) {
      if (selectedSeasonId) {
        setSelectedSeasonId("");
      }
      return;
    }

    if (!availableSeasons.some((season) => season.id === selectedSeasonId)) {
      setSelectedSeasonId(availableSeasons[0].id);
    }
  }, [availableSeasons, selectedSeasonId]);

  const leadersQuery = useQuery(
    api.games.getSeasonLeaders,
    activeTab === "home" && selectedSeasonId && !isDemoMode
      ? {
          orgSlug,
          seasonId: selectedSeasonId,
          limit: 5,
        }
      : "skip",
  );

  const seasonStatsTableQuery = useQuery(
    api.games.getSeasonStatsTable,
    activeTab !== "home" && selectedSeasonId && !isDemoMode
      ? {
          orgSlug,
          seasonId: selectedSeasonId,
        }
      : "skip",
  );

  const leaders = isDemoMode ? DEMO_LEADERS : leadersQuery;
  const seasonStatsTable = isDemoMode
    ? DEMO_SEASON_TABLE
    : seasonStatsTableQuery;

  const selectedSeasonName = useMemo(
    () =>
      availableSeasons.find((season) => season.id === selectedSeasonId)?.name ??
      "",
    [availableSeasons, selectedSeasonId],
  );

  const playerColumns = useMemo(() => createSeasonPlayerStatsColumns(t), [t]);
  const teamColumns = useMemo(() => createSeasonTeamStatsColumns(t), [t]);

  const playerRows = seasonStatsTable?.players ?? [];
  const teamRows = seasonStatsTable?.teams ?? [];

  const playerFilterConfigs = useMemo(
    () => createSeasonPlayerStatsFilterConfigs(t, playerRows),
    [playerRows, t],
  );

  const updateTabInUrl = (tab: StatsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  if (availableSeasons.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          {t("games.leaders.noSeasons")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => updateTabInUrl(value as StatsTab)}
        className="gap-0"
      >
        <TabsList className="flex h-fit w-full items-center gap-2 overflow-x-auto overflow-y-hidden border-b pb-2.5 pt-1">
          <TabsTrigger value="home" className="mr-0 flex-none px-3 py-1.5">
            {t("games.leaders.tabs.home")}
          </TabsTrigger>
          <TabsTrigger value="players" className="mr-0 flex-none px-3 py-1.5">
            {t("games.leaders.tabs.players")}
          </TabsTrigger>
          <TabsTrigger value="teams" className="mr-0 flex-none px-3 py-1.5">
            {t("games.leaders.tabs.teams")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide">
            {activeTab === "home"
              ? t("games.leaders.seasonLeaders")
              : activeTab === "players"
                ? t("games.leaders.playersStatsTitle")
                : t("games.leaders.teamsStatsTitle")}
          </h1>
          {selectedSeasonName && (
            <p className="text-sm text-muted-foreground">
              {selectedSeasonName}
            </p>
          )}
        </div>

        <div className="w-full md:w-[280px]">
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue placeholder={t("games.selectSeason")} />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {activeTab === "home" && (
        <>
          {leaders === undefined ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              {t("games.leaders.loading")}
            </div>
          ) : leaders.gamesCount === 0 ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              {t("games.leaders.noSeasonGames")}
            </div>
          ) : (
            <>
              <section className="rounded-md border bg-card p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-wide">
                      {t("games.leaders.playersTitle")}
                    </h2>
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {t("games.leaders.gamesCount", {
                        count: leaders.gamesCount,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary"
                    onClick={() => updateTabInUrl("players")}
                  >
                    {t("games.leaders.seeAllPlayersStats")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <PlayerLeadersCard
                    title={t("games.statsLabels.ppg")}
                    rows={leaders.playerLeaders.pointsPerGame}
                    metricKey="pointsPerGame"
                  />
                  <PlayerLeadersCard
                    title={t("games.statsLabels.rpg")}
                    rows={leaders.playerLeaders.reboundsPerGame}
                    metricKey="reboundsPerGame"
                  />
                  <PlayerLeadersCard
                    title={t("games.statsLabels.apg")}
                    rows={leaders.playerLeaders.assistsPerGame}
                    metricKey="assistsPerGame"
                  />
                  <PlayerLeadersCard
                    title={t("games.statsLabels.spg")}
                    rows={leaders.playerLeaders.stealsPerGame}
                    metricKey="stealsPerGame"
                  />
                  <PlayerLeadersCard
                    title={t("games.statsLabels.bpg")}
                    rows={leaders.playerLeaders.blocksPerGame}
                    metricKey="blocksPerGame"
                  />
                </div>
              </section>

              <section className="rounded-md border bg-card p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-wide">
                      {t("games.leaders.teamsTitle")}
                    </h2>
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {t("games.leaders.gamesCount", {
                        count: leaders.gamesCount,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary"
                    onClick={() => updateTabInUrl("teams")}
                  >
                    {t("games.leaders.seeAllTeamsStats")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <TeamLeadersCard
                    title={t("games.statsLabels.teamPpg")}
                    rows={leaders.teamLeaders.pointsForPerGame}
                    metricKey="pointsForPerGame"
                  />
                  <TeamLeadersCard
                    title={t("games.statsLabels.teamPpgAllowed")}
                    rows={leaders.teamLeaders.pointsAllowedPerGame}
                    metricKey="pointsAllowedPerGame"
                  />
                  <TeamLeadersCard
                    title={t("games.statsLabels.teamRebTotal")}
                    rows={leaders.teamLeaders.reboundsPerGame}
                    metricKey="reboundsPerGame"
                  />
                  <TeamLeadersCard
                    title={t("games.statsLabels.teamAssists")}
                    rows={leaders.teamLeaders.assistsPerGame}
                    metricKey="assistsPerGame"
                  />
                  <TeamLeadersCard
                    title={t("games.leaders.winPct")}
                    rows={leaders.teamLeaders.winPct}
                    metricKey="winPct"
                    isPercent
                  />
                </div>
              </section>
            </>
          )}
        </>
      )}

      {activeTab === "players" && (
        <div className="space-y-3">
          {seasonStatsTable === undefined ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              {t("games.leaders.loading")}
            </div>
          ) : (
            <div className={COMPACT_STATS_TABLE_CLASS}>
              <DataTable
                columns={playerColumns}
                data={playerRows}
                filterColumn="search"
                filterPlaceholder={t("games.leaders.playersSearchPlaceholder")}
                filterConfigs={playerFilterConfigs}
                emptyMessage={t("games.leaders.playersEmpty")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                initialSorting={[{ id: "pointsPerGame", desc: true }]}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "teams" && (
        <div className="space-y-3">
          {seasonStatsTable === undefined ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              {t("games.leaders.loading")}
            </div>
          ) : (
            <div className={COMPACT_STATS_TABLE_CLASS}>
              <DataTable
                columns={teamColumns}
                data={teamRows}
                filterColumn="search"
                filterPlaceholder={t("games.leaders.teamsSearchPlaceholder")}
                emptyMessage={t("games.leaders.teamsEmpty")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                initialSorting={[{ id: "winPct", desc: true }]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
