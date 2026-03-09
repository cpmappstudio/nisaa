"use client";

import { useMemo, useState } from "react";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { darkenHex } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { PlayerFormDialogComponent } from "@/components/sections/shell/teams/shared/player-form.types";
import { PlayerBioDialog } from "./player-bio-dialog";
import { PlayerHighlightDialog } from "./player-highlight-dialog";
import { PlayerHighlightsStrip } from "./player-highlights-strip";
import { PlayerProfileHeader } from "./player-profile-header";

interface PlayerDetailClientProps {
  preloadedPlayer: Preloaded<typeof api.players.getPlayerDetailByClubSlug>;
  orgSlug: string;
  PlayerFormDialogComponent: PlayerFormDialogComponent;
}

export function PlayerDetailClient({
  preloadedPlayer,
  orgSlug,
  PlayerFormDialogComponent,
}: PlayerDetailClientProps) {
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

  const positionMap = useMemo(() => {
    const map = new Map<string, { name: string; abbreviation: string }>();
    if (teamConfig?.positions) {
      for (const pos of teamConfig.positions) {
        map.set(pos.id, { name: pos.name, abbreviation: pos.abbreviation });
      }
    }
    return map;
  }, [teamConfig?.positions]);

  if (player === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  const positionData = player.position
    ? positionMap.get(player.position)
    : null;
  const positionName = positionData
    ? positionData.name
    : player.position
      ? player.position
          .replaceAll("_", " ")
          .split(" ")
          .filter(Boolean)
          .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
          .join(" ")
      : undefined;

  const canManagePlayerContent =
    player.viewerAccessLevel === "superadmin" ||
    player.viewerAccessLevel === "admin" ||
    player.viewerAccessLevel === "coach";
  const bioTitle = player.bioTitle?.trim() || t("players.bio");
  const bioContent = player.bioContent?.trim() || t("players.bioPlaceholder");
  const primaryColor = player.clubPrimaryColor ?? null;
  const accentColor = primaryColor ? darkenHex(primaryColor, 0.2) : null;
  const positions = teamConfig?.positions ?? [];

  return (
    <div className="space-y-0">
      <PlayerProfileHeader
        player={player}
        orgSlug={orgSlug}
        positionName={positionName}
        canEdit={isLoaded && isAdmin}
        onEdit={() => setIsEditOpen(true)}
      />

      <PlayerFormDialogComponent
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        clubSlug={player.clubSlug}
        positions={positions}
        player={{
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          secondLastName: player.secondLastName ?? null,
          photoUrl: player.photoUrl ?? null,
          dateOfBirth: player.dateOfBirth ?? null,
          documentNumber: player.documentNumber ?? null,
          gender: player.gender ?? null,
          jerseyNumber: player.jerseyNumber ?? null,
          position: player.position ?? null,
          height: player.height ?? null,
          weight: player.weight ?? null,
          country: player.country ?? null,
          cometNumber: player.cometNumber ?? null,
          fifaId: player.fifaId ?? null,
          dominantProfile: player.dominantProfile ?? null,
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

      <div className="space-y-4 px-4 py-4 md:px-6">
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

        <section
          className="rounded-md border bg-card p-4"
          style={accentColor ? { borderColor: `${accentColor}33` } : undefined}
        >
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
                <span className="hidden md:block">{t("actions.edit")}</span>
              </Button>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {bioContent}
          </p>
        </section>
      </div>
    </div>
  );
}
