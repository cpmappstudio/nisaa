"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TeamPlayersTable } from "@/components/sections/shell/teams/shared/team-players-table";
import type { PlayerFormDialogComponent } from "@/components/sections/shell/teams/shared/player-form.types";

interface LeagueRosterClientProps {
  preloadedPlayers: Preloaded<typeof api.players.listPlayersByLeagueSlug>;
  orgSlug: string;
  PlayerFormDialogComponent: PlayerFormDialogComponent;
}

export function LeagueRosterClient({
  preloadedPlayers,
  orgSlug,
  PlayerFormDialogComponent,
}: LeagueRosterClientProps) {
  const players = usePreloadedQuery(preloadedPlayers);

  return (
    <div className="p-4 md:p-6 ">
      <TeamPlayersTable
        players={players ?? []}
        orgSlug={orgSlug}
        routeScope="org"
        enableCreate={false}
        PlayerFormDialogComponent={PlayerFormDialogComponent}
      />
    </div>
  );
}
