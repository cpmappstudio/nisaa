import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
  gameId: string;
}>;

export default async function TeamGameDetailPage({
  params,
}: {
  params: Params;
}) {
  const { tenant, team, gameId } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderTeamGameDetailPage({
    tenant,
    teamSlug: team,
    gameId,
    token,
  });
}
