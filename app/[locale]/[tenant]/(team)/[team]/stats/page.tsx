import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamStatsPage({ params }: { params: Params }) {
  const { tenant, team } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return await sportModule.renderTeamStatsPage({
    tenant,
    teamSlug: team,
    token,
  });
}
