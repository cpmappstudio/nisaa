import { getAuthToken } from "@/lib/auth/auth";
import { resolveLeagueSportModule } from "@/lib/sports/server";

interface GameDetailPageProps {
  params: Promise<{
    tenant: string;
    gameId: string;
  }>;
}

export default async function GameDetailPage({ params }: GameDetailPageProps) {
  const { tenant, gameId } = await params;
  const token = await getAuthToken();
  const sportModule = await resolveLeagueSportModule(tenant, token);

  return sportModule.renderGameDetailPage({ tenant, gameId, token });
}
