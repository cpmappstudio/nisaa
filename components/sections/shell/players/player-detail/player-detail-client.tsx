"use client";

import { useMemo, useState } from "react";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { DataTable } from "@/components/table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPACT_STATS_TABLE_CLASS } from "@/components/sections/shell/stats/stats-columns";
import { darkenHex } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { PlayerFormDialog } from "@/components/sections/shell/teams/basketball/team-settings/player-form-dialog";
import { PlayerBioDialog } from "./player-bio-dialog";
import { PlayerHighlightDialog } from "./player-highlight-dialog";
import { PlayerHighlightsStrip } from "./player-highlights-strip";
import {
  createPlayerGameLogColumns,
  PlayerRecentStatsPreview,
} from "./player-recent-stats";
import { PlayerProfileHeader } from "./player-profile-header";
import { resolvePlayerPositionLabel } from "@/lib/players/positions";

interface PlayerDetailClientProps {
  preloadedPlayer: Preloaded<
    typeof api.players.getBasketballPlayerDetailByClubSlug
  >;
  orgSlug: string;
}

export function PlayerDetailClient({
  preloadedPlayer,
  orgSlug,
}: PlayerDetailClientProps) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const player = usePreloadedQuery(preloadedPlayer);
  const { isAdmin, isLoaded } = useIsAdmin();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBioEditOpen, setIsBioEditOpen] = useState(false);
  const [isHighlightDialogOpen, setIsHighlightDialogOpen] = useState(false);
  const [highlightToEdit, setHighlightToEdit] = useState<{
    id: string;
    title: string;
    url: string;
    videoId: string;
  } | null>(null);

  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  const playerGameLog = useQuery(
    api.players.listBasketballPlayerGameLog,
    player
      ? {
          playerId: player._id,
          limit: 100,
        }
      : "skip",
  );

  const positionMap = useMemo(() => {
    const map = new Map<string, { name: string; abbreviation: string }>();
    if (teamConfig?.positions) {
      for (const pos of teamConfig.positions) {
        map.set(pos.id, { name: pos.name, abbreviation: pos.abbreviation });
      }
    }
    return map;
  }, [teamConfig?.positions]);
  const positions = teamConfig?.positions ?? [];
  const playerGameLogColumns = useMemo(
    () => createPlayerGameLogColumns(t, locale),
    [locale, t],
  );

  if (player === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  const primaryColor = player.clubPrimaryColor ?? null;
  const darkerColor = primaryColor ? darkenHex(primaryColor, 0.2) : null;
  const positionData = player.position
    ? positionMap.get(player.position)
    : null;
  const positionName = positionData
    ? positionData.name
    : resolvePlayerPositionLabel(player.position, positions, "name");
  const gameLogRows = playerGameLog ?? [];
  const canManagePlayerContent =
    player.viewerAccessLevel === "superadmin" ||
    player.viewerAccessLevel === "admin" ||
    player.viewerAccessLevel === "coach";
  const bioTitle = player.bioTitle?.trim() || t("players.bio");
  const bioContent = player.bioContent?.trim() || t("players.bioPlaceholder");

  return (
    <div className="space-y-0">
      <PlayerProfileHeader
        player={player}
        orgSlug={orgSlug}
        positionName={positionName}
        statsBackgroundColor={darkerColor}
        canEdit={isLoaded && isAdmin}
        onEdit={() => setIsEditOpen(true)}
      />

      <PlayerFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        clubSlug={player.clubSlug}
        positions={positions}
        player={{
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: player.photoUrl ?? null,
          dateOfBirth: player.dateOfBirth ?? null,
          jerseyNumber: player.jerseyNumber ?? null,
          position: player.position ?? null,
          height: player.height ?? null,
          weight: player.weight ?? null,
          country: player.country ?? null,
          categoryId: player.categoryId,
        }}
      />
      <PlayerBioDialog
        open={isBioEditOpen}
        onOpenChange={setIsBioEditOpen}
        playerId={player._id}
        initialTitle={player.bioTitle}
        initialContent={player.bioContent}
      />
      <PlayerHighlightDialog
        open={isHighlightDialogOpen}
        onOpenChange={(open) => {
          setIsHighlightDialogOpen(open);
          if (!open) {
            setTimeout(() => setHighlightToEdit(null), 150);
          }
        }}
        playerId={player._id}
        highlight={highlightToEdit}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className={
            darkerColor
              ? "w-full justify-start rounded-none px-4 py-2.5 shadow-xs md:px-6"
              : "w-full justify-start rounded-none px-4 py-2.5 md:px-6"
          }
          style={darkerColor ? { backgroundColor: darkerColor } : undefined}
        >
          <TabsTrigger
            value="profile"
            style={darkerColor ? { color: "white" } : undefined}
          >
            {t("players.profile")}
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            style={darkerColor ? { color: "white" } : undefined}
          >
            {t("games.stats")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 px-4 py-4 md:px-6">
          <div className="space-y-4">
            <PlayerHighlightsStrip
              highlights={player.highlights ?? []}
              canManage={canManagePlayerContent}
              onAdd={() => {
                setHighlightToEdit(null);
                setIsHighlightDialogOpen(true);
              }}
              onEditHighlight={(highlight) => {
                setHighlightToEdit(highlight);
                setIsHighlightDialogOpen(true);
              }}
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section className="order-2 rounded-md border bg-card p-4 xl:order-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {bioTitle}
                  </h2>
                  {canManagePlayerContent && (
                    <Button
                      type="button"
                      onClick={() => setIsBioEditOpen(true)}
                      className="rounded-full bg-transparent text-foreground ring-1 ring-border hover:bg-accent/40"
                      size="sm"
                    >
                      <Settings className="size-4" />
                      <span className="hidden md:block">
                        {t("actions.edit")}
                      </span>
                    </Button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {bioContent}
                </p>
              </section>

              <PlayerRecentStatsPreview
                className="order-1 xl:order-2"
                rows={gameLogRows}
                isLoading={playerGameLog === undefined}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="stats" className="mt-0 px-4 py-4 md:px-6">
          {playerGameLog === undefined ? (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              {t("games.leaders.loading")}
            </div>
          ) : (
            <div className={COMPACT_STATS_TABLE_CLASS}>
              <DataTable
                columns={playerGameLogColumns}
                data={gameLogRows}
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
