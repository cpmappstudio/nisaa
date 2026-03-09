import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamRosterPage({ params }: { params: Params }) {
  const { tenant, team } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderTeamRosterPage({
    tenant,
    teamSlug: team,
    token,
  });
}
