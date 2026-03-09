"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DataTable } from "@/components/table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPACT_STATS_TABLE_CLASS } from "@/components/sections/shell/stats/basketball/stats-columns";
import { PlayerHighlightsStrip } from "@/components/sections/shell/players/shared/player-detail/player-highlights-strip";
import { darkenHex } from "@/lib/utils";
import {
  createPlayerGameLogColumns,
  PlayerRecentStatsPreview,
  type PlayerGameLogRow,
} from "./player-recent-stats";
import { PlayerProfileHeader } from "./player-profile-header";

interface PlayerDemoPageProps {
  orgSlug: string;
}

const DEMO_PLAYER = {
  firstName: "LeBron",
  lastName: "James",
  photoUrl: "https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png",
  dateOfBirth: "1984-12-30",
  jerseyNumber: 23,
  height: 206,
  weight: 113,
  country: "us",
  clubName: "Los Angeles Lakers",
  clubSlug: "lakers",
  clubLogoUrl: "https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg",
  clubPrimaryColor: "#552583",
  pointsPerGame: 25.7,
  reboundsPerGame: 7.8,
  assistsPerGame: 8.2,
  gamesPlayed: 61,
} as const;

const DEMO_HIGHLIGHTS = [
  {
    id: "demo-1",
    title: "41 year LeBron James ...",
    url: "https://www.youtube.com/watch?v=Z4jQvWl7Y6Q",
    videoId: "Z4jQvWl7Y6Q",
  },
  {
    id: "demo-2",
    title: "Clutch 4th quarter takeover",
    url: "https://www.youtube.com/watch?v=7t1hX6D6D4w",
    videoId: "7t1hX6D6D4w",
  },
  {
    id: "demo-3",
    title: "Full game highlights vs Nuggets",
    url: "https://www.youtube.com/watch?v=7nQf7Q2mMZU",
    videoId: "7nQf7Q2mMZU",
  },
];

const DEMO_BIO = {
  title: "Professional Career",
  content:
    "LeBron James is one of the most complete players in basketball history. He combines elite scoring, playmaking and decision-making, allowing him to impact every possession. Across multiple eras, he has maintained top-level production while adapting his game to teammates and opponents.\n\nHis profile in this demo is intended to preview the player page experience: highlights strip, recent-game snapshot, and detailed per-game statistics in the stats tab.",
};

const DEMO_GAME_LOG: PlayerGameLogRow[] = [
  {
    gameId: "demo-game-1",
    date: "2026-02-27",
    startTime: "22:00",
    gameType: "season",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Denver Nuggets",
    opponentNickname: "DEN",
    result: "W",
    teamScore: 121,
    opponentScore: 114,
    minutes: 36,
    points: 31,
    rebounds: 9,
    assists: 11,
    steals: 2,
    blocks: 1,
    plusMinus: 12,
  },
  {
    gameId: "demo-game-2",
    date: "2026-02-24",
    startTime: "20:30",
    gameType: "season",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Phoenix Suns",
    opponentNickname: "PHX",
    result: "L",
    teamScore: 108,
    opponentScore: 112,
    minutes: 38,
    points: 27,
    rebounds: 7,
    assists: 8,
    steals: 1,
    blocks: 0,
    plusMinus: -4,
  },
  {
    gameId: "demo-game-3",
    date: "2026-02-21",
    startTime: "21:00",
    gameType: "quick",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Golden State Warriors",
    opponentNickname: "GSW",
    result: "W",
    teamScore: 125,
    opponentScore: 118,
    minutes: 34,
    points: 29,
    rebounds: 10,
    assists: 9,
    steals: 1,
    blocks: 1,
    plusMinus: 9,
  },
  {
    gameId: "demo-game-4",
    date: "2026-02-18",
    startTime: "19:30",
    gameType: "season",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Dallas Mavericks",
    opponentNickname: "DAL",
    result: "W",
    teamScore: 117,
    opponentScore: 110,
    minutes: 35,
    points: 24,
    rebounds: 8,
    assists: 12,
    steals: 2,
    blocks: 0,
    plusMinus: 10,
  },
  {
    gameId: "demo-game-5",
    date: "2026-02-15",
    startTime: "21:30",
    gameType: "season",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Minnesota Timberwolves",
    opponentNickname: "MIN",
    result: "L",
    teamScore: 102,
    opponentScore: 109,
    minutes: 37,
    points: 22,
    rebounds: 6,
    assists: 7,
    steals: 1,
    blocks: 1,
    plusMinus: -6,
  },
  {
    gameId: "demo-game-6",
    date: "2026-02-12",
    startTime: "20:00",
    gameType: "quick",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Sacramento Kings",
    opponentNickname: "SAC",
    result: "W",
    teamScore: 128,
    opponentScore: 120,
    minutes: 33,
    points: 34,
    rebounds: 11,
    assists: 6,
    steals: 1,
    blocks: 2,
    plusMinus: 14,
  },
  {
    gameId: "demo-game-7",
    date: "2026-02-09",
    startTime: "20:30",
    gameType: "season",
    teamName: "Los Angeles Lakers",
    teamNickname: "LAL",
    opponentName: "Boston Celtics",
    opponentNickname: "BOS",
    result: "L",
    teamScore: 111,
    opponentScore: 116,
    minutes: 39,
    points: 26,
    rebounds: 9,
    assists: 10,
    steals: 2,
    blocks: 1,
    plusMinus: -3,
  },
];

export function PlayerDemoPage({ orgSlug }: PlayerDemoPageProps) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const darkerColor = darkenHex(DEMO_PLAYER.clubPrimaryColor, 0.2);

  const gameLogColumns = useMemo(
    () => createPlayerGameLogColumns(t, locale),
    [locale, t],
  );

  return (
    <div className="space-y-0">
      <PlayerProfileHeader
        player={DEMO_PLAYER}
        orgSlug={orgSlug}
        positionName="Forward"
        statsBackgroundColor={darkerColor}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="w-full justify-start rounded-none px-4 py-2.5 shadow-xs md:px-6"
          style={{ backgroundColor: darkerColor }}
        >
          <TabsTrigger value="profile" style={{ color: "white" }}>
            {t("players.profile")}
          </TabsTrigger>
          <TabsTrigger value="stats" style={{ color: "white" }}>
            {t("games.stats")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 px-4 py-4 md:px-6">
          <div className="space-y-4">
            <PlayerHighlightsStrip
              highlights={DEMO_HIGHLIGHTS}
              canManage={false}
              onAdd={() => undefined}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className="order-2 rounded-md border bg-card p-4 xl:order-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {DEMO_BIO.title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {DEMO_BIO.content}
                </p>
              </section>

              <PlayerRecentStatsPreview
                className="order-1 xl:order-2"
                rows={DEMO_GAME_LOG}
                isLoading={false}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0 px-4 py-4 md:px-6">
          <div className={COMPACT_STATS_TABLE_CLASS}>
            <DataTable
              columns={gameLogColumns}
              data={DEMO_GAME_LOG}
              filterColumn="search"
              filterPlaceholder={t("players.statsSearchPlaceholder")}
              emptyMessage={t("players.statsEmpty")}
              columnsMenuLabel={t("table.columns")}
              filtersMenuLabel={t("table.filters")}
              previousLabel={t("actions.previous")}
              nextLabel={t("actions.next")}
              initialSorting={[{ id: "date", desc: true }]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
