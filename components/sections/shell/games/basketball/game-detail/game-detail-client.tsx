"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameHeader } from "@/components/sections/shell/games/shared/game-detail/game-header";
import { GameStatsTable } from "./game-stats-table";
import { GameBoxScore } from "./game-box-score";

interface GameDetailClientProps {
  preloadedGame: Preloaded<typeof api.games.getById>;
  orgSlug: string;
}

export function GameDetailClient({
  preloadedGame,
  orgSlug,
}: GameDetailClientProps) {
  const t = useTranslations("Common");
  const game = usePreloadedQuery(preloadedGame);

  if (game === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <GameHeader game={game} orgSlug={orgSlug} />

      <Tabs defaultValue="boxScore" className="w-full">
        <div className="w-full overflow-x-auto overflow-y-hidden bg-muted/50 shadow-xs">
          <TabsList className="inline-flex min-w-max flex-nowrap justify-start rounded-none px-4 py-2.5 md:px-6">
            <TabsTrigger value="boxScore" className="flex-none shrink-0">
              {t("games.boxScore")}
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-none shrink-0">
              {t("games.stats")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="boxScore" className="mt-4 px-6">
          <GameBoxScore game={game} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4 px-6">
          <GameStatsTable game={game} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
