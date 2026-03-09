import { preloadQuery, fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TeamsTable } from "@/components/sections/shell/teams/shared/teams-table";
import { SeasonStatsPage } from "@/components/sections/shell/stats/basketball/season-stats-page";
import { TeamDetailClient } from "@/components/sections/shell/teams/shared/team-detail/team-detail-client";
import { TeamSettingsClient } from "@/components/sections/shell/teams/basketball/team-settings-client";
import { LeagueRosterClient } from "@/components/sections/shell/teams/basketball/league-roster-client";
import { TeamRosterClient } from "@/components/sections/shell/teams/basketball/team-roster-client";
import { PlayerDetailClient } from "@/components/sections/shell/players/basketball/player-detail/player-detail-client";
import { GameDetailClient } from "@/components/sections/shell/games/basketball/game-detail/game-detail-client";
import { TeamGameDetailClient } from "@/components/sections/team/basketball/games/team-game-detail-client";
import {
  renderSharedGameDetailPage,
  renderSharedLeagueRosterPage,
  renderSharedTeamDetailPage,
  renderSharedTeamRosterPage,
  renderSharedTeamSettingsPage,
  renderSharedTeamsPage,
} from "./shared";
import type { SportPageModule } from "./types";

async function renderBasketballStatsPage(tenant: string, token?: string) {
  const preloadedSeasons = await preloadQuery(
    api.leagueSettings.listSeasons,
    {
      leagueSlug: tenant,
    },
    { token },
  );

  return (
    <SeasonStatsPage preloadedSeasons={preloadedSeasons} orgSlug={tenant} />
  );
}

export const basketballSportModule: SportPageModule = {
  async renderTeamsPage({ tenant, token }) {
    return await renderSharedTeamsPage(tenant, token, (props) => (
      <TeamsTable {...props} />
    ));
  },

  async renderLeagueStatsPage({ tenant, token }) {
    return await renderBasketballStatsPage(tenant, token);
  },

  async renderTeamStatsPage({ tenant, token, teamSlug: _teamSlug }) {
    return await renderBasketballStatsPage(tenant, token);
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
      api.players.getBasketballPlayerDetailByClubSlug,
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

  async renderTeamGameDetailPage({ tenant, teamSlug, gameId, token }) {
    const club = await fetchQuery(
      api.clubs.getBySlug,
      { slug: teamSlug },
      { token },
    );

    if (!club) {
      notFound();
    }

    const preloadedGame = await preloadQuery(
      api.games.getById,
      {
        gameId: gameId as Id<"games">,
      },
      { token },
    );

    return (
      <TeamGameDetailClient
        preloadedGame={preloadedGame}
        orgSlug={tenant}
        clubSlug={teamSlug}
        clubId={club._id}
      />
    );
  },
};
