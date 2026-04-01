import { TeamSettingsClient } from "@/components/sections/shell/teams/basketball/team-settings/team-settings-client";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

interface TeamSettingsPageProps {
  params: Promise<{
    tenant: string;
    teamId: string;
  }>;
}

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  const { tenant, teamId } = await params;
  const token = await getAuthToken();

  const preloadedTeam = await preloadQuery(
    api.clubs.getBySlug,
    {
      slug: teamId,
    },
    { token },
  );
  const preloadedPlayers = await preloadQuery(
    api.players.listBasketballPlayersByClubSlug,
    {
      clubSlug: teamId,
    },
    { token },
  );
  const preloadedStaff = await preloadQuery(
    api.staff.listAllByClubSlug,
    {
      clubSlug: teamId,
    },
    { token },
  );

  return (
    <TeamSettingsClient
      preloadedTeam={preloadedTeam}
      preloadedPlayers={preloadedPlayers}
      preloadedStaff={preloadedStaff}
      orgSlug={tenant}
      clubSlug={teamId}
    />
  );
}
