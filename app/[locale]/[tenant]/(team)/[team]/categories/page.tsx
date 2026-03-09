import { TeamCategoriesClient } from "@/components/sections/shell/teams/shared/team-categories-client";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamCategoriesPage({
  params,
}: {
  params: Params;
}) {
  const { tenant, team } = await params;
  const token = await getAuthToken();

  const preloadedCategories = await preloadQuery(
    api.categories.listByClubSlugWithPlayerCount,
    {
      clubSlug: team,
    },
    { token },
  );

  return (
    <TeamCategoriesClient
      preloadedCategories={preloadedCategories}
      clubSlug={team}
      orgSlug={tenant}
    />
  );
}
