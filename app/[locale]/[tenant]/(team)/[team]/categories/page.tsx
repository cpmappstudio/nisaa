import { redirect } from "next/navigation";
import { TEAM_ROUTES } from "@/lib/navigation/routes";

type Params = Promise<{
  tenant: string;
  team: string;
}>;

export default async function TeamCategoriesPage({
  params,
}: {
  params: Params;
}) {
  const { tenant, team } = await params;
  redirect(TEAM_ROUTES.roster(tenant, team));
}
