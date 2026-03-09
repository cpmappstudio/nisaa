import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface TeamsPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderTeamsPage({ tenant, token });
}
