"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  transformTeamStats,
  emptyTeamTotals,
  formatMadeAttempted,
  type PlayerBoxScoreRow,
  type TeamGameTotals,
} from "@/lib/sports/basketball/game-stats";

interface Team {
  name: string;
  logoUrl?: string;
}

interface GameBoxScoreProps {
  game: {
    _id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
  };
}

function TeamBoxScore({
  team,
  starters,
  bench,
  totals,
  t,
}: {
  team: Team;
  starters: PlayerBoxScoreRow[];
  bench: PlayerBoxScoreRow[];
  totals: TeamGameTotals;
  t: (key: string) => string;
}) {
  const primaryColor = "#6b7280";

  const renderPlayerRow = (player: PlayerBoxScoreRow) => {
    return (
      <TableRow key={player.id}>
        <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-background z-10">
          <div className="flex items-center gap-1">
            <span className="truncate max-w-[120px]">{player.name}</span>
            {player.jerseyNumber && (
              <span className="text-muted-foreground text-xs">
                #{player.jerseyNumber}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.minutes}
        </TableCell>
        <TableCell className="text-center tabular-nums font-medium">
          {player.points}
        </TableCell>
        <TableCell className="text-center tabular-nums">{player.fg}</TableCell>
        <TableCell className="text-center tabular-nums">
          {player.threePt}
        </TableCell>
        <TableCell className="text-center tabular-nums">{player.ft}</TableCell>
        <TableCell className="text-center tabular-nums">
          {player.rebounds}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.assists}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.turnovers}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.steals}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.blocks}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.offReb}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.defReb}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.fouls}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {player.plusMinus > 0 ? `+${player.plusMinus}` : player.plusMinus}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div
        className="flex items-center gap-3 border-b p-3"
        style={{
          borderLeftWidth: "4px",
          borderLeftColor: primaryColor,
        }}
      >
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.name}
            width={24}
            height={24}
            className="object-contain"
          />
        ) : (
          <div
            className="size-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {team.name.charAt(0)}
          </div>
        )}
        <Text className="font-semibold">{team.name}</Text>
      </div>

      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[140px]">
                {t("games.boxScoreLabels.starters")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.min")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.pts")}
              </TableHead>
              <TableHead className="text-center w-14">
                {t("games.boxScoreLabels.fg")}
              </TableHead>
              <TableHead className="text-center w-14">
                {t("games.boxScoreLabels.threePt")}
              </TableHead>
              <TableHead className="text-center w-14">
                {t("games.boxScoreLabels.ft")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.reb")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.ast")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.to")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.stl")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.blk")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.oreb")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.dreb")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.pf")}
              </TableHead>
              <TableHead className="text-center w-12">
                {t("games.boxScoreLabels.plusMinus")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {starters.map(renderPlayerRow)}

            {bench.length > 0 && (
              <>
                <TableRow className="bg-muted/30">
                  <TableCell className="sticky left-0 bg-muted/30 z-10 font-semibold text-xs uppercase text-muted-foreground">
                    {t("games.boxScoreLabels.bench")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.min")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.pts")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.fg")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.threePt")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.ft")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.reb")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.ast")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.to")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.stl")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.blk")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.oreb")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.dreb")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.pf")}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {t("games.boxScoreLabels.plusMinus")}
                  </TableCell>
                </TableRow>

                {bench.map(renderPlayerRow)}
              </>
            )}

            <TableRow className="bg-muted/50 font-semibold">
              <TableCell className="sticky left-0 bg-muted/50 z-10 uppercase text-xs">
                {t("games.boxScoreLabels.team")}
              </TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.points}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatMadeAttempted(
                  totals.fieldGoalsMade,
                  totals.fieldGoalsAttempted,
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatMadeAttempted(
                  totals.threePointersMade,
                  totals.threePointersAttempted,
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {formatMadeAttempted(
                  totals.freeThrowsMade,
                  totals.freeThrowsAttempted,
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.rebounds}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.assists}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.turnovers}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.steals}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.blocks}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.offensiveRebounds}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.defensiveRebounds}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.personalFouls}
              </TableCell>
              <TableCell className="text-center"></TableCell>
            </TableRow>

            <TableRow className="text-muted-foreground text-xs">
              <TableCell className="sticky left-0 bg-background z-10"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.fieldGoalPct}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.threePointPct}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {totals.freeThrowPct}
              </TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
              <TableCell className="text-center"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function GameBoxScore({ game }: GameBoxScoreProps) {
  const t = useTranslations("Common");

  const gameStats = useQuery(api.games.getGamePlayerStats, {
    gameId: game._id as Id<"games">,
  });

  const homeTeam: Team = {
    name: game.homeTeamName,
    logoUrl: game.homeTeamLogo,
  };

  const awayTeam: Team = {
    name: game.awayTeamName,
    logoUrl: game.awayTeamLogo,
  };

  // Transform stats using shared utility
  const homeData = gameStats?.homeStats?.length
    ? transformTeamStats(gameStats.homeStats)
    : { starters: [], bench: [], totals: emptyTeamTotals };

  const awayData = gameStats?.awayStats?.length
    ? transformTeamStats(gameStats.awayStats)
    : { starters: [], bench: [], totals: emptyTeamTotals };

  const hasStats =
    (gameStats?.homeStats?.length ?? 0) > 0 ||
    (gameStats?.awayStats?.length ?? 0) > 0;

  return (
    <div className="pt-3 space-y-6">
      <TeamBoxScore
        team={homeTeam}
        starters={homeData.starters}
        bench={homeData.bench}
        totals={homeData.totals}
        t={t}
      />

      <TeamBoxScore
        team={awayTeam}
        starters={awayData.starters}
        bench={awayData.bench}
        totals={awayData.totals}
        t={t}
      />

      {!hasStats && (
        <p className="text-center text-xs text-muted-foreground">
          {t("games.boxScoreNote")}
        </p>
      )}
    </div>
  );
}
