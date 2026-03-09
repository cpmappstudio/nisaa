import { TeamGamesTable } from "@/components/sections/team/shared/games/team-games-table";
import { preloadQuery, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import { notFound } from "next/navigation";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamGamesPage({ params }: { params: Params }) {
  const { tenant, team } = await params;
  const token = await getAuthToken();

  const club = await fetchQuery(api.clubs.getBySlug, { slug: team }, { token });

  if (!club) {
    notFound();
  }

  const preloadedGames = await preloadQuery(
    api.games.listByClubSlug,
    {
      clubSlug: team,
    },
    { token },
  );

  return (
    <TeamGamesTable
      preloadedGames={preloadedGames}
      orgSlug={tenant}
      clubSlug={team}
      clubId={club._id}
    />
  );
}
