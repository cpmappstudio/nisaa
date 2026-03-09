import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface StatsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return await sportModule.renderLeagueStatsPage({
    tenant,
    token,
  });
}
