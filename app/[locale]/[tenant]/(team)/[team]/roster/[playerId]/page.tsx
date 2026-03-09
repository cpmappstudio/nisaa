import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
  playerId: string;
}>;

export default async function TeamRosterPlayerDetailPage({
  params,
}: {
  params: Params;
}) {
  const { tenant, team, playerId } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderPlayerDetailPage({
    tenant,
    teamSlug: team,
    playerId,
    token,
  });
}
