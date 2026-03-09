"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GameHeader } from "@/components/sections/shell/games/shared/game-detail/game-header";
import { GameStatsTable } from "@/components/sections/shell/games/basketball/game-detail/game-stats-table";
import { GameBoxScore } from "@/components/sections/shell/games/basketball/game-detail/game-box-score";
import { StatsEntryForm } from "./stats-entry-form";
import { StatsConfirmView, WaitingForOpponent } from "./stats-confirm-view";
import { Clock } from "lucide-react";

interface TeamGameDetailClientProps {
  preloadedGame: Preloaded<typeof api.games.getById>;
  orgSlug: string;
  clubSlug: string;
  clubId: string;
}

export function TeamGameDetailClient({
  preloadedGame,
  orgSlug,
  clubSlug,
  clubId,
}: TeamGameDetailClientProps) {
  const t = useTranslations("Common");
  const game = usePreloadedQuery(preloadedGame);

  if (game === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  // Determine if this club is home or away team
  const isHomeTeam = game.homeClubId === clubId;
  const isAwayTeam = game.awayClubId === clubId;
  const isParticipant = isHomeTeam || isAwayTeam;

  // Check if game has started
  const gameDateTime = new Date(`${game.date}T${game.startTime}`);
  const hasGameStarted = new Date() >= gameDateTime;

  // Check submission status for this team
  const teamHasSubmitted = isHomeTeam
    ? !!game.homeStatsSubmittedAt
    : !!game.awayStatsSubmittedAt;

  const opponentHasSubmitted = isHomeTeam
    ? !!game.awayStatsSubmittedAt
    : !!game.homeStatsSubmittedAt;

  // Check confirmation status
  const teamHasConfirmed = isHomeTeam
    ? !!game.homeStatsConfirmed
    : !!game.awayStatsConfirmed;

  // Get opponent name
  const opponentName = isHomeTeam ? game.awayTeamName : game.homeTeamName;

  // Determine what to show
  const showStatsEntry =
    isParticipant &&
    hasGameStarted &&
    !teamHasSubmitted &&
    (game.status === "scheduled" || game.status === "awaiting_stats");

  const showWaitingForOpponent =
    isParticipant &&
    teamHasSubmitted &&
    !opponentHasSubmitted &&
    game.status === "awaiting_stats";

  const showConfirmStats =
    isParticipant && game.status === "pending_review" && !teamHasConfirmed;

  const showGameNotStarted =
    isParticipant && !hasGameStarted && game.status === "scheduled";

  const showAlreadySubmitted =
    isParticipant &&
    teamHasSubmitted &&
    opponentHasSubmitted &&
    teamHasConfirmed &&
    game.status === "pending_review";

  return (
    <div className="space-y-0">
      <GameHeader game={game} orgSlug={orgSlug} />

      {/* Stats Entry Section - Only for team view */}
      {isParticipant && (
        <div className="p-4 md:p-6 border-b">
          {showGameNotStarted && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t("games.statsEntry.gameNotStarted")}
              </AlertDescription>
            </Alert>
          )}

          {showStatsEntry && (
            <StatsEntryForm
              gameId={game._id as Id<"games">}
              clubId={clubId as Id<"clubs">}
              clubSlug={clubSlug}
            />
          )}

          {showWaitingForOpponent && <WaitingForOpponent />}

          {showConfirmStats && (
            <StatsConfirmView
              gameId={game._id as Id<"games">}
              clubId={clubId as Id<"clubs">}
              opponentName={opponentName}
              hasConfirmed={teamHasConfirmed}
            />
          )}

          {showAlreadySubmitted && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <AlertDescription className="text-green-700 dark:text-green-400">
                {t("games.statsEntry.alreadySubmitted")}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs defaultValue="boxScore" className="w-full">
        <TabsList className="w-full justify-start rounded-none py-2.5 bg-muted/50 px-4 md:px-6">
          <TabsTrigger value="boxScore">{t("games.boxScore")}</TabsTrigger>
          <TabsTrigger value="stats">{t("games.stats")}</TabsTrigger>
        </TabsList>
        <TabsContent value="boxScore" className="mt-4 px-4 md:px-6">
          <GameBoxScore game={game} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4 px-4 md:px-6">
          <GameStatsTable game={game} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
