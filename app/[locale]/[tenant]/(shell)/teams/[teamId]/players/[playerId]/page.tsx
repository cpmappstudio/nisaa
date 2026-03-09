import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface TeamPlayerDetailPageProps {
  params: Promise<{
    tenant: string;
    teamId: string;
    playerId: string;
  }>;
}

export default async function TeamPlayerDetailPage({
  params,
}: TeamPlayerDetailPageProps) {
  const { tenant, teamId, playerId } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderPlayerDetailPage({
    tenant,
    teamSlug: teamId,
    playerId,
    token,
  });
}
