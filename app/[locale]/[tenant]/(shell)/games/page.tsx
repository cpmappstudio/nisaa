import { GamesTable } from "@/components/sections/shell/games/shared/games-table";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

interface GamesPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function GamesPage({ params }: GamesPageProps) {
  const { tenant } = await params;
  const token = await getAuthToken();

  const preloadedGames = await preloadQuery(
    api.games.listByLeagueSlug,
    {
      orgSlug: tenant,
    },
    { token },
  );

  return <GamesTable preloadedGames={preloadedGames} orgSlug={tenant} />;
}
