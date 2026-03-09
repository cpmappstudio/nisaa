"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import {
  createGameColumns,
  createGameFilterConfigs,
  type GameRow,
} from "@/components/sections/shell/games/shared/columns";
import { CreateGameDialog } from "@/components/sections/shell/games/shared/create-game-dialog";
import { TEAM_ROUTES } from "@/lib/navigation/routes";

interface TeamGamesTableProps {
  preloadedGames: Preloaded<typeof api.games.listByClubSlug>;
  orgSlug: string;
  clubSlug: string;
  clubId: string;
}

export function TeamGamesTable({
  preloadedGames,
  orgSlug,
  clubSlug,
  clubId,
}: TeamGamesTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const data = usePreloadedQuery(preloadedGames);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleRowClick = (game: GameRow) => {
    router.push(TEAM_ROUTES.games.detail(orgSlug, clubSlug, game._id));
  };

  const gameColumns = createGameColumns(t);
  const gameFilterConfigs = createGameFilterConfigs(t);

  return (
    <div className="p-4 md:p-6 ">
      <DataTable
        columns={gameColumns}
        data={data ?? []}
        filterColumn="search"
        filterPlaceholder={t("games.searchPlaceholder")}
        filterConfigs={gameFilterConfigs}
        emptyMessage={t("games.emptyMessage")}
        columnsMenuLabel={t("table.columns")}
        filtersMenuLabel={t("table.filters")}
        previousLabel={t("actions.previous")}
        nextLabel={t("actions.next")}
        onCreate={() => setIsCreateOpen(true)}
        onRowClick={handleRowClick}
      />

      <CreateGameDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        orgSlug={orgSlug}
        preselectedClubId={clubId}
      />
    </div>
  );
}
