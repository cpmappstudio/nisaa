"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TeamStaffTable } from "@/components/sections/shell/teams/shared/team-staff-table";

interface TeamStaffClientProps {
  preloadedStaff: Preloaded<typeof api.staff.listAllByClubSlug>;
  clubSlug: string;
  orgSlug: string;
  withPadding?: boolean;
}

export function TeamStaffClient({
  preloadedStaff,
  clubSlug,
  orgSlug,
  withPadding = true,
}: TeamStaffClientProps) {
  // Hydrate the preloaded data - this ensures reactivity for real-time updates
  usePreloadedQuery(preloadedStaff);

  // TeamStaffTable uses useQuery internally, which will now be hydrated
  // with the preloaded data for instant display, then stay reactive
  if (!withPadding) {
    return <TeamStaffTable clubSlug={clubSlug} orgSlug={orgSlug} />;
  }

  return (
    <div className="p-4 md:p-6">
      <TeamStaffTable clubSlug={clubSlug} orgSlug={orgSlug} />
    </div>
  );
}
