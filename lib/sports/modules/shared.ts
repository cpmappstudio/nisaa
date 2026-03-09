import { preloadQuery } from "convex/nextjs";
import type { Preloaded } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export async function preloadSharedTeamsPageData(
  tenant: string,
  token?: string,
) {
  const [preloadedTeams, preloadedGames] = await Promise.all([
    preloadQuery(
      api.clubs.listByLeague,
      {
        orgSlug: tenant,
      },
      { token },
    ),
    preloadQuery(
      api.games.listByLeagueSlug,
      {
        orgSlug: tenant,
      },
      { token },
    ),
  ]);

  return {
    preloadedTeams,
    preloadedGames,
  };
}

export async function preloadSharedTeamSettingsPageData(
  teamSlug: string,
  token?: string,
) {
  const [preloadedTeam, preloadedPlayers, preloadedCategories, preloadedStaff] =
    await Promise.all([
      preloadQuery(
        api.clubs.getBySlug,
        {
          slug: teamSlug,
        },
        { token },
      ),
      preloadQuery(
        api.players.listPlayersByClubSlug,
        {
          clubSlug: teamSlug,
        },
        { token },
      ),
      preloadQuery(
        api.categories.listByClubSlugWithPlayerCount,
        {
          clubSlug: teamSlug,
        },
        { token },
      ),
      preloadQuery(
        api.staff.listAllByClubSlug,
        {
          clubSlug: teamSlug,
        },
        { token },
      ),
    ]);

  return {
    preloadedTeam,
    preloadedPlayers,
    preloadedCategories,
    preloadedStaff,
  };
}

export async function preloadSharedLeagueRosterData(
  tenant: string,
  token?: string,
) {
  return await preloadQuery(
    api.players.listPlayersByLeagueSlug,
    {
      leagueSlug: tenant,
    },
    { token },
  );
}

export async function preloadSharedTeamRosterData(
  teamSlug: string,
  token?: string,
) {
  return await preloadQuery(
    api.players.listPlayersByClubSlug,
    {
      clubSlug: teamSlug,
    },
    { token },
  );
}

export async function renderSharedTeamsPage(
  tenant: string,
  token: string | undefined,
  render: (args: {
    preloadedTeams: Preloaded<typeof api.clubs.listByLeague>;
    preloadedGames: Preloaded<typeof api.games.listByLeagueSlug>;
    orgSlug: string;
  }) => ReactNode,
) {
  const { preloadedTeams, preloadedGames } = await preloadSharedTeamsPageData(
    tenant,
    token,
  );

  return render({
    preloadedTeams,
    preloadedGames,
    orgSlug: tenant,
  });
}

export async function renderSharedTeamDetailPage(
  tenant: string,
  teamSlug: string,
  token: string | undefined,
  routeScope: "org" | "team",
  render: (args: {
    preloadedTeam: Preloaded<typeof api.clubs.getBySlug>;
    orgSlug: string;
    routeScope: "org" | "team";
  }) => ReactNode,
) {
  const preloadedTeam = await preloadQuery(
    api.clubs.getBySlug,
    {
      slug: teamSlug,
    },
    { token },
  );

  return render({
    preloadedTeam,
    orgSlug: tenant,
    routeScope,
  });
}

export async function renderSharedTeamSettingsPage(
  tenant: string,
  teamSlug: string,
  token: string | undefined,
  render: (args: {
    preloadedTeam: Preloaded<typeof api.clubs.getBySlug>;
    preloadedPlayers: Preloaded<typeof api.players.listPlayersByClubSlug>;
    preloadedCategories: Preloaded<
      typeof api.categories.listByClubSlugWithPlayerCount
    >;
    preloadedStaff: Preloaded<typeof api.staff.listAllByClubSlug>;
    orgSlug: string;
    clubSlug: string;
  }) => ReactNode,
) {
  const {
    preloadedTeam,
    preloadedPlayers,
    preloadedCategories,
    preloadedStaff,
  } = await preloadSharedTeamSettingsPageData(teamSlug, token);

  return render({
    preloadedTeam,
    preloadedPlayers,
    preloadedCategories,
    preloadedStaff,
    orgSlug: tenant,
    clubSlug: teamSlug,
  });
}

export async function renderSharedLeagueRosterPage(
  tenant: string,
  token: string | undefined,
  render: (args: {
    preloadedPlayers: Preloaded<typeof api.players.listPlayersByLeagueSlug>;
    orgSlug: string;
  }) => ReactNode,
) {
  const preloadedPlayers = await preloadSharedLeagueRosterData(tenant, token);

  return render({
    preloadedPlayers,
    orgSlug: tenant,
  });
}

export async function renderSharedTeamRosterPage(
  tenant: string,
  teamSlug: string,
  token: string | undefined,
  render: (args: {
    preloadedPlayers: Preloaded<typeof api.players.listPlayersByClubSlug>;
    clubSlug: string;
    orgSlug: string;
  }) => ReactNode,
) {
  const preloadedPlayers = await preloadSharedTeamRosterData(teamSlug, token);

  return render({
    preloadedPlayers,
    clubSlug: teamSlug,
    orgSlug: tenant,
  });
}

export async function renderSharedGameDetailPage(
  tenant: string,
  gameId: string,
  token: string | undefined,
  render: (args: {
    preloadedGame: Preloaded<typeof api.games.getById>;
    orgSlug: string;
  }) => ReactNode,
) {
  const preloadedGame = await preloadQuery(
    api.games.getById,
    {
      gameId: gameId as Id<"games">,
    },
    { token },
  );

  return render({
    preloadedGame,
    orgSlug: tenant,
  });
}
