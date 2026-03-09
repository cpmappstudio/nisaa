import "server-only";

import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";
import type { SportType } from "./types";
import { getSportPageModule } from "./modules/registry";

export async function resolveLeagueSportType(
  leagueSlug: string,
  token?: string,
): Promise<SportType> {
  const resolvedToken = token ?? (await getAuthToken());
  return await fetchQuery(
    api.leagueSettings.getSportTypeByLeagueSlug,
    { leagueSlug },
    { token: resolvedToken },
  );
}

export async function resolveLeagueSportModule(
  leagueSlug: string,
  token?: string,
) {
  const sportType = await resolveLeagueSportType(leagueSlug, token);
  return getSportPageModule(sportType);
}
