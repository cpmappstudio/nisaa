import type { ReactNode } from "react";
import { preloadQuery } from "convex/nextjs";
import { Heading } from "@/components/ui/heading";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TeamsTable } from "@/components/sections/shell/teams/shared/teams-table";
import { TeamDetailClient } from "@/components/sections/shell/teams/shared/team-detail/team-detail-client";
import { TeamSettingsClient } from "@/components/sections/shell/teams/soccer/team-settings-client";
import { LeagueRosterClient } from "@/components/sections/shell/teams/soccer/league-roster-client";
import { TeamRosterClient } from "@/components/sections/shell/teams/soccer/team-roster-client";
import { PlayerDetailClient } from "@/components/sections/shell/players/soccer/player-detail/player-detail-client";
import { GameDetailClient } from "@/components/sections/shell/games/shared/game-detail/game-detail-client";
import {
  renderSharedGameDetailPage,
  renderSharedLeagueRosterPage,
  renderSharedTeamDetailPage,
  renderSharedTeamRosterPage,
  renderSharedTeamSettingsPage,
  renderSharedTeamsPage,
} from "./shared";
import type { SportPageModule } from "./types";

function renderSoccerNotImplementedPage(): ReactNode {
  return (
    <div className="p-4 md:p-6">
      <Heading level={2}>Soccer module not implemented yet</Heading>
    </div>
  );
}

export const soccerSportModule: SportPageModule = {
  async renderTeamsPage({ tenant, token }) {
    return await renderSharedTeamsPage(tenant, token, (props) => (
      <TeamsTable {...props} />
    ));
  },
  async renderLeagueStatsPage() {
    return renderSoccerNotImplementedPage();
  },
  async renderTeamStatsPage() {
    return renderSoccerNotImplementedPage();
  },
  async renderTeamDetailPage({ tenant, teamSlug, token, routeScope }) {
    return await renderSharedTeamDetailPage(
      tenant,
      teamSlug,
      token,
      routeScope,
      (props) => <TeamDetailClient {...props} />,
    );
  },
  async renderTeamSettingsPage({ tenant, teamSlug, token }) {
    return await renderSharedTeamSettingsPage(
      tenant,
      teamSlug,
      token,
      (props) => <TeamSettingsClient {...props} />,
    );
  },
  async renderLeagueRosterPage({ tenant, token }) {
    return await renderSharedLeagueRosterPage(tenant, token, (props) => (
      <LeagueRosterClient {...props} />
    ));
  },
  async renderTeamRosterPage({ tenant, teamSlug, token }) {
    return await renderSharedTeamRosterPage(
      tenant,
      teamSlug,
      token,
      (props) => <TeamRosterClient {...props} />,
    );
  },
  async renderPlayerDetailPage({ tenant, teamSlug, playerId, token }) {
    const preloadedPlayer = await preloadQuery(
      api.players.getPlayerDetailByClubSlug,
      {
        clubSlug: teamSlug,
        playerId: playerId as Id<"players">,
      },
      { token },
    );

    return (
      <PlayerDetailClient preloadedPlayer={preloadedPlayer} orgSlug={tenant} />
    );
  },
  async renderGameDetailPage({ tenant, gameId, token }) {
    return await renderSharedGameDetailPage(tenant, gameId, token, (props) => (
      <GameDetailClient {...props} />
    ));
  },
  async renderTeamGameDetailPage({ tenant, gameId, token }) {
    return await renderSharedGameDetailPage(tenant, gameId, token, (props) => (
      <GameDetailClient {...props} />
    ));
  },
};
