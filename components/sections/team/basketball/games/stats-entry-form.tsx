"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
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
import { AlertCircle, Check } from "lucide-react";

interface PlayerStatEntry {
  playerId: Id<"players">;
  playerName: string;
  jerseyNumber?: number;
  isStarter: boolean;
  minutes: number;
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
  plusMinus: number;
}

interface StatsEntryFormProps {
  gameId: Id<"games">;
  clubId: Id<"clubs">;
  clubSlug: string;
  onSuccess?: () => void;
}

const STAT_FIELDS = [
  { key: "minutes", label: "MIN", width: "w-14" },
  { key: "points", label: "PTS", width: "w-14" },
  { key: "fieldGoalsMade", label: "FGM", width: "w-14" },
  { key: "fieldGoalsAttempted", label: "FGA", width: "w-14" },
  { key: "threePointersMade", label: "3PM", width: "w-14" },
  { key: "threePointersAttempted", label: "3PA", width: "w-14" },
  { key: "freeThrowsMade", label: "FTM", width: "w-14" },
  { key: "freeThrowsAttempted", label: "FTA", width: "w-14" },
  { key: "offensiveRebounds", label: "OREB", width: "w-14" },
  { key: "defensiveRebounds", label: "DREB", width: "w-14" },
  { key: "assists", label: "AST", width: "w-14" },
  { key: "steals", label: "STL", width: "w-14" },
  { key: "blocks", label: "BLK", width: "w-14" },
  { key: "turnovers", label: "TO", width: "w-14" },
  { key: "personalFouls", label: "PF", width: "w-14" },
  { key: "plusMinus", label: "+/-", width: "w-14" },
] as const;

type StatKey = (typeof STAT_FIELDS)[number]["key"];

export function StatsEntryForm({
  gameId,
  clubId,
  clubSlug,
  onSuccess,
}: StatsEntryFormProps) {
  const t = useTranslations("Common");

  const players = useQuery(api.players.listPlayersByClubSlug, {
    clubSlug,
  });

  const submitStats = useMutation(api.games.submitTeamStats);

  const [teamScore, setTeamScore] = useState<number>(0);
  const [playerStats, setPlayerStats] = useState<PlayerStatEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize player stats when players load
  if (players && playerStats.length === 0 && players.length > 0) {
    const initialStats: PlayerStatEntry[] = players.map(
      (player: (typeof players)[number], index: number) => ({
        playerId: player._id as Id<"players">,
        playerName: `${player.firstName} ${player.lastName}`,
        jerseyNumber: player.jerseyNumber,
        isStarter: index < 5,
        minutes: 0,
        points: 0,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        threePointersMade: 0,
        threePointersAttempted: 0,
        freeThrowsMade: 0,
        freeThrowsAttempted: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        personalFouls: 0,
        plusMinus: 0,
      }),
    );
    setPlayerStats(initialStats);
  }

  const updatePlayerStat = (
    playerId: Id<"players">,
    field: StatKey | "isStarter",
    value: number | boolean,
  ) => {
    setPlayerStats((prev) =>
      prev.map((stat) =>
        stat.playerId === playerId ? { ...stat, [field]: value } : stat,
      ),
    );
  };

  const calculateTotalPoints = () => {
    return playerStats.reduce((sum, stat) => sum + (stat.points || 0), 0);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Use calculated total if teamScore is 0
      const finalScore = teamScore || calculateTotalPoints();

      await submitStats({
        gameId,
        clubId,
        teamScore: finalScore,
        playerStats: playerStats.map((stat) => ({
          playerId: stat.playerId,
          isStarter: stat.isStarter,
          minutes: stat.minutes || undefined,
          points: stat.points || undefined,
          fieldGoalsMade: stat.fieldGoalsMade || undefined,
          fieldGoalsAttempted: stat.fieldGoalsAttempted || undefined,
          threePointersMade: stat.threePointersMade || undefined,
          threePointersAttempted: stat.threePointersAttempted || undefined,
          freeThrowsMade: stat.freeThrowsMade || undefined,
          freeThrowsAttempted: stat.freeThrowsAttempted || undefined,
          offensiveRebounds: stat.offensiveRebounds || undefined,
          defensiveRebounds: stat.defensiveRebounds || undefined,
          assists: stat.assists || undefined,
          steals: stat.steals || undefined,
          blocks: stat.blocks || undefined,
          turnovers: stat.turnovers || undefined,
          personalFouls: stat.personalFouls || undefined,
          plusMinus: stat.plusMinus || undefined,
        })),
      });

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("games.statsEntry.submitFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!players) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted-foreground">{t("actions.loading")}</span>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t("games.statsEntry.noPlayers")}</AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <Check className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          {t("games.statsEntry.submitted")}
        </AlertDescription>
      </Alert>
    );
  }

  const starters = playerStats.filter((p) => p.isStarter);
  const bench = playerStats.filter((p) => !p.isStarter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {t("games.statsEntry.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("games.statsEntry.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel>{t("games.statsEntry.teamScore")}</FieldLabel>
          <Input
            type="number"
            min={0}
            value={teamScore || calculateTotalPoints()}
            onChange={(e) => setTeamScore(parseInt(e.target.value) || 0)}
            className="w-20"
          />
        </div>
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
              <TableHead className="text-center w-12">
                <span className="text-xs">5</span>
              </TableHead>
              {STAT_FIELDS.map((field) => (
                <TableHead
                  key={field.key}
                  className={`text-center ${field.width}`}
                >
                  {field.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {starters.map((stat) => (
              <PlayerStatRow
                key={stat.playerId}
                stat={stat}
                onUpdate={(field, value) =>
                  updatePlayerStat(stat.playerId, field, value)
                }
              />
            ))}

            <TableRow className="bg-muted/30">
              <TableCell className="sticky left-0 bg-muted/30 z-10 font-semibold text-xs uppercase text-muted-foreground">
                {t("games.boxScoreLabels.bench")}
              </TableCell>
              <TableCell />
              {STAT_FIELDS.map((field) => (
                <TableCell
                  key={field.key}
                  className="text-center text-xs text-muted-foreground"
                >
                  {field.label}
                </TableCell>
              ))}
            </TableRow>

            {bench.map((stat) => (
              <PlayerStatRow
                key={stat.playerId}
                stat={stat}
                onUpdate={(field, value) =>
                  updatePlayerStat(stat.playerId, field, value)
                }
              />
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? t("games.statsEntry.submitting")
            : t("games.statsEntry.submitStats")}
        </Button>
      </div>
    </div>
  );
}

interface PlayerStatRowProps {
  stat: PlayerStatEntry;
  onUpdate: (field: StatKey | "isStarter", value: number | boolean) => void;
}

function PlayerStatRow({ stat, onUpdate }: PlayerStatRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[120px]">{stat.playerName}</span>
          {stat.jerseyNumber !== undefined && (
            <span className="text-muted-foreground text-xs">
              #{stat.jerseyNumber}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={stat.isStarter}
          onCheckedChange={(checked) => onUpdate("isStarter", checked === true)}
        />
      </TableCell>
      {STAT_FIELDS.map((field) => (
        <TableCell key={field.key} className="p-1">
          <Input
            type="number"
            min={field.key === "plusMinus" ? undefined : 0}
            value={stat[field.key] || ""}
            onChange={(e) => onUpdate(field.key, parseInt(e.target.value) || 0)}
            className="h-8 w-full text-center text-sm p-1"
          />
        </TableCell>
      ))}
    </TableRow>
  );
}
