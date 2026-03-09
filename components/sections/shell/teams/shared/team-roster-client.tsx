"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TeamPlayersTable } from "@/components/sections/shell/teams/shared/team-players-table";
import type { PlayerFormDialogComponent } from "@/components/sections/shell/teams/shared/player-form.types";

interface TeamRosterClientProps {
  preloadedPlayers: Preloaded<typeof api.players.listPlayersByClubSlug>;
  clubSlug: string;
  orgSlug: string;
  PlayerFormDialogComponent: PlayerFormDialogComponent;
}

export function TeamRosterClient({
  preloadedPlayers,
  clubSlug,
  orgSlug,
  PlayerFormDialogComponent,
}: TeamRosterClientProps) {
  const players = usePreloadedQuery(preloadedPlayers);

  return (
    <div className="p-4 md:p-6 ">
      <TeamPlayersTable
        players={players ?? []}
        clubSlug={clubSlug}
        orgSlug={orgSlug}
        routeScope="team"
        PlayerFormDialogComponent={PlayerFormDialogComponent}
      />
    </div>
  );
}
