import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface OrgRosterPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function OrgRosterPage({ params }: OrgRosterPageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderLeagueRosterPage({ tenant, token });
}
