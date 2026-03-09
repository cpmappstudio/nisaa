"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Heading } from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateTeamTotals,
  emptyTeamTotals,
  formatMadeAttempted,
  type TeamGameTotals,
} from "@/lib/sports/basketball/game-stats";

interface Team {
  name: string;
  logoUrl?: string;
}

interface GameStatsTableProps {
  game: {
    _id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
  };
}

interface StatRow {
  label: string;
  home: string | number;
  away: string | number;
  isSubRow?: boolean;
}

function TeamLogo({ team, size = 32 }: { team: Team; size?: number }) {
  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={size}
        height={size}
        className="object-contain"
      />
    );
  }

  const bgColor = "#6b7280";
  const initial = team.name.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{
        backgroundColor: bgColor,
        width: size,
        height: size,
        fontSize: size * 0.5,
      }}
    >
      {initial}
    </div>
  );
}

function StatsSection({
  title,
  stats,
  homeTeam,
  awayTeam,
}: {
  title: string;
  stats: StatRow[];
  homeTeam: Team;
  awayTeam: Team;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-1/2 font-semibold uppercase text-xs tracking-wide">
              {title}
            </TableHead>
            <TableHead className="w-1/4 text-center">
              <div className="flex justify-center">
                <TeamLogo team={homeTeam} size={28} />
              </div>
            </TableHead>
            <TableHead className="w-1/4 text-center">
              <div className="flex justify-center">
                <TeamLogo team={awayTeam} size={28} />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, index) => (
            <TableRow key={index}>
              <TableCell
                className={`font-medium ${stat.isSubRow ? "pl-8 text-muted-foreground" : ""}`}
              >
                {stat.label}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {stat.home}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {stat.away}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function buildShootingStats(
  homeTotals: TeamGameTotals,
  awayTotals: TeamGameTotals,
  t: (key: string) => string,
): StatRow[] {
  return [
    {
      label: t("games.gameStats.points"),
      home: homeTotals.points,
      away: awayTotals.points,
    },
    {
      label: t("games.gameStats.fieldGoals"),
      home: formatMadeAttempted(
        homeTotals.fieldGoalsMade,
        homeTotals.fieldGoalsAttempted,
      ),
      away: formatMadeAttempted(
        awayTotals.fieldGoalsMade,
        awayTotals.fieldGoalsAttempted,
      ),
    },
    {
      label: t("games.gameStats.fieldGoalPct"),
      home: homeTotals.fieldGoalPct,
      away: awayTotals.fieldGoalPct,
      isSubRow: true,
    },
    {
      label: t("games.gameStats.threePointers"),
      home: formatMadeAttempted(
        homeTotals.threePointersMade,
        homeTotals.threePointersAttempted,
      ),
      away: formatMadeAttempted(
        awayTotals.threePointersMade,
        awayTotals.threePointersAttempted,
      ),
    },
    {
      label: t("games.gameStats.threePointPct"),
      home: homeTotals.threePointPct,
      away: awayTotals.threePointPct,
      isSubRow: true,
    },
    {
      label: t("games.gameStats.freeThrows"),
      home: formatMadeAttempted(
        homeTotals.freeThrowsMade,
        homeTotals.freeThrowsAttempted,
      ),
      away: formatMadeAttempted(
        awayTotals.freeThrowsMade,
        awayTotals.freeThrowsAttempted,
      ),
    },
    {
      label: t("games.gameStats.freeThrowPct"),
      home: homeTotals.freeThrowPct,
      away: awayTotals.freeThrowPct,
      isSubRow: true,
    },
  ];
}

function buildReboundingStats(
  homeTotals: TeamGameTotals,
  awayTotals: TeamGameTotals,
  t: (key: string) => string,
): StatRow[] {
  return [
    {
      label: t("games.gameStats.totalRebounds"),
      home: homeTotals.rebounds,
      away: awayTotals.rebounds,
    },
    {
      label: t("games.gameStats.offensiveRebounds"),
      home: homeTotals.offensiveRebounds,
      away: awayTotals.offensiveRebounds,
      isSubRow: true,
    },
    {
      label: t("games.gameStats.defensiveRebounds"),
      home: homeTotals.defensiveRebounds,
      away: awayTotals.defensiveRebounds,
      isSubRow: true,
    },
  ];
}

function buildPlaymakingStats(
  homeTotals: TeamGameTotals,
  awayTotals: TeamGameTotals,
  t: (key: string) => string,
): StatRow[] {
  return [
    {
      label: t("games.gameStats.assists"),
      home: homeTotals.assists,
      away: awayTotals.assists,
    },
    {
      label: t("games.gameStats.turnovers"),
      home: homeTotals.turnovers,
      away: awayTotals.turnovers,
    },
    {
      label: t("games.gameStats.assistTurnoverRatio"),
      home: homeTotals.assistToTurnoverRatio,
      away: awayTotals.assistToTurnoverRatio,
    },
  ];
}

function buildDefenseStats(
  homeTotals: TeamGameTotals,
  awayTotals: TeamGameTotals,
  t: (key: string) => string,
): StatRow[] {
  return [
    {
      label: t("games.gameStats.steals"),
      home: homeTotals.steals,
      away: awayTotals.steals,
    },
    {
      label: t("games.gameStats.blocks"),
      home: homeTotals.blocks,
      away: awayTotals.blocks,
    },
    {
      label: t("games.gameStats.personalFouls"),
      home: homeTotals.personalFouls,
      away: awayTotals.personalFouls,
    },
  ];
}

export function GameStatsTable({ game }: GameStatsTableProps) {
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

  // Calculate totals from player stats
  const homeTotals = gameStats?.homeStats?.length
    ? calculateTeamTotals(gameStats.homeStats)
    : emptyTeamTotals;

  const awayTotals = gameStats?.awayStats?.length
    ? calculateTeamTotals(gameStats.awayStats)
    : emptyTeamTotals;

  const hasStats =
    (gameStats?.homeStats?.length ?? 0) > 0 ||
    (gameStats?.awayStats?.length ?? 0) > 0;

  const shootingStats = buildShootingStats(homeTotals, awayTotals, t);
  const reboundingStats = buildReboundingStats(homeTotals, awayTotals, t);
  const playmakingStats = buildPlaymakingStats(homeTotals, awayTotals, t);
  const defenseStats = buildDefenseStats(homeTotals, awayTotals, t);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <Heading level={3}>{t("games.statsHeaders.team")}</Heading>

        <StatsSection
          title={t("games.gameStats.shooting")}
          stats={shootingStats}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        <StatsSection
          title={t("games.gameStats.rebounding")}
          stats={reboundingStats}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        <StatsSection
          title={t("games.gameStats.playmaking")}
          stats={playmakingStats}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />

        <StatsSection
          title={t("games.gameStats.defense")}
          stats={defenseStats}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      </section>

      {!hasStats && (
        <p className="text-center text-sm text-muted-foreground">
          {t("games.statsComingSoon")}
        </p>
      )}
    </div>
  );
}
