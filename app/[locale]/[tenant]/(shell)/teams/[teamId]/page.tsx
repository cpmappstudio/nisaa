import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface TeamDetailPageProps {
  params: Promise<{
    tenant: string;
    teamId: string;
  }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { tenant, teamId } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderTeamDetailPage({
    tenant,
    teamSlug: teamId,
    token,
    routeScope: "org",
  });
}
