import { TeamStaffClient } from "@/components/sections/shell/teams/shared/team-staff-client";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

type Params = Promise<{
  locale: string;
  tenant: string;
  team: string;
}>;

export default async function TeamStaffPage({ params }: { params: Params }) {
  const { tenant, team } = await params;
  const token = await getAuthToken();

  const preloadedStaff = await preloadQuery(
    api.staff.listAllByClubSlug,
    {
      clubSlug: team,
    },
    { token },
  );

  return (
    <TeamStaffClient
      preloadedStaff={preloadedStaff}
      clubSlug={team}
      orgSlug={tenant}
    />
  );
}
