import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

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
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderTeamSettingsPage({
    tenant,
    teamSlug: teamId,
    token,
  });
}
