"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Clock } from "lucide-react";

interface StatsConfirmViewProps {
  gameId: Id<"games">;
  clubId: Id<"clubs">;
  opponentName: string;
  hasConfirmed: boolean;
  onSuccess?: () => void;
}

const STAT_COLUMNS = [
  { key: "minutes", label: "MIN" },
  { key: "points", label: "PTS" },
  { key: "fieldGoals", label: "FG" },
  { key: "threePointers", label: "3PT" },
  { key: "freeThrows", label: "FT" },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "turnovers", label: "TO" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "fouls", label: "PF" },
  { key: "plusMinus", label: "+/-" },
] as const;

export function StatsConfirmView({
  gameId,
  clubId,
  opponentName,
  hasConfirmed,
  onSuccess,
}: StatsConfirmViewProps) {
  const t = useTranslations("Common");

  const gameStats = useQuery(api.games.getGamePlayerStats, { gameId });
  const confirmStats = useMutation(api.games.confirmOpponentStats);

  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setError(null);
    setIsConfirming(true);

    try {
      await confirmStats({ gameId, clubId });
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.statsEntry.confirmFailed"));
    } finally {
      setIsConfirming(false);
    }
  };

  if (!gameStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted-foreground">{t("actions.loading")}</span>
      </div>
    );
  }

  // Get opponent stats (the stats that are NOT from our club)
  const opponentStats =
    gameStats.homeStats[0]?.clubId === clubId
      ? gameStats.awayStats
      : gameStats.homeStats;

  if (hasConfirmed || success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <Check className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          {t("games.statsEntry.confirmed")}
        </AlertDescription>
      </Alert>
    );
  }

  const starters = opponentStats.filter((s) => s.isStarter);
  const bench = opponentStats.filter((s) => !s.isStarter);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t("games.statsEntry.reviewOpponent")}</h3>
        <p className="text-sm text-muted-foreground">
          {opponentName}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                {t("games.boxScoreLabels.starters")}
              </TableHead>
              {STAT_COLUMNS.map((col) => (
                <TableHead key={col.key} className="text-center w-14">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {starters.map((stat) => (
              <StatRow key={stat._id} stat={stat} />
            ))}

            <TableRow className="bg-muted/30">
              <TableCell className="sticky left-0 bg-muted/30 z-10 font-semibold text-xs uppercase text-muted-foreground">
                {t("games.boxScoreLabels.bench")}
              </TableCell>
              {STAT_COLUMNS.map((col) => (
                <TableCell key={col.key} className="text-center text-xs text-muted-foreground">
                  {col.label}
                </TableCell>
              ))}
            </TableRow>

            {bench.map((stat) => (
              <StatRow key={stat._id} stat={stat} />
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex justify-end">
        <Button onClick={handleConfirm} disabled={isConfirming}>
          {isConfirming ? t("games.statsEntry.confirming") : t("games.statsEntry.confirmStats")}
        </Button>
      </div>
    </div>
  );
}

interface StatRowProps {
  stat: {
    _id: string;
    playerName: string;
    jerseyNumber?: number;
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
    turnovers?: number;
    steals?: number;
    blocks?: number;
    personalFouls?: number;
    plusMinus?: number;
  };
}

function StatRow({ stat }: StatRowProps) {
  const totalRebounds = (stat.offensiveRebounds || 0) + (stat.defensiveRebounds || 0);
  const fieldGoals = `${stat.fieldGoalsMade || 0}-${stat.fieldGoalsAttempted || 0}`;
  const threePointers = `${stat.threePointersMade || 0}-${stat.threePointersAttempted || 0}`;
  const freeThrows = `${stat.freeThrowsMade || 0}-${stat.freeThrowsAttempted || 0}`;

  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[120px]">{stat.playerName}</span>
          {stat.jerseyNumber !== undefined && (
            <span className="text-muted-foreground text-xs">#{stat.jerseyNumber}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center tabular-nums">{stat.minutes || 0}</TableCell>
      <TableCell className="text-center tabular-nums font-medium">{stat.points || 0}</TableCell>
      <TableCell className="text-center tabular-nums">{fieldGoals}</TableCell>
      <TableCell className="text-center tabular-nums">{threePointers}</TableCell>
      <TableCell className="text-center tabular-nums">{freeThrows}</TableCell>
      <TableCell className="text-center tabular-nums">{totalRebounds}</TableCell>
      <TableCell className="text-center tabular-nums">{stat.assists || 0}</TableCell>
      <TableCell className="text-center tabular-nums">{stat.turnovers || 0}</TableCell>
      <TableCell className="text-center tabular-nums">{stat.steals || 0}</TableCell>
      <TableCell className="text-center tabular-nums">{stat.blocks || 0}</TableCell>
      <TableCell className="text-center tabular-nums">{stat.personalFouls || 0}</TableCell>
      <TableCell className="text-center tabular-nums">
        {(stat.plusMinus || 0) > 0 ? `+${stat.plusMinus}` : stat.plusMinus || 0}
      </TableCell>
    </TableRow>
  );
}

interface WaitingForOpponentProps {
  message?: string;
}

export function WaitingForOpponent({ message }: WaitingForOpponentProps) {
  const t = useTranslations("Common");

  return (
    <Alert>
      <Clock className="h-4 w-4" />
      <AlertDescription>
        {message || t("games.statsEntry.waitingForOpponent")}
      </AlertDescription>
    </Alert>
  );
}
