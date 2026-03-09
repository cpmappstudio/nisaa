import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { isSingleTenantMode } from "./tenancy";

type SportCtx = QueryCtx | MutationCtx;
export type SupportedSportType = "basketball" | "soccer";

function parseSportType(
  value: string | undefined,
): SupportedSportType | undefined {
  return value === "soccer" || value === "basketball" ? value : undefined;
}

const configuredSingleTenantDefaultSportType = parseSportType(
  process.env.DEFAULT_SPORT_TYPE ?? process.env.NEXT_PUBLIC_DEFAULT_SPORT_TYPE,
);

export const DEFAULT_SPORT_TYPE: SupportedSportType =
  configuredSingleTenantDefaultSportType ?? "basketball";

export function getDefaultSportType(): SupportedSportType {
  if (isSingleTenantMode()) {
    return configuredSingleTenantDefaultSportType ?? DEFAULT_SPORT_TYPE;
  }

  return "basketball";
}

export async function getOrganizationSportType(
  ctx: SportCtx,
  organizationId: Id<"organizations">,
): Promise<SupportedSportType> {
  const settings = await ctx.db
    .query("leagueSettings")
    .withIndex("byOrganization", (q) => q.eq("organizationId", organizationId))
    .unique();

  return settings?.sportType ?? getDefaultSportType();
}

export async function ensureOrganizationSportType(
  ctx: SportCtx,
  organizationId: Id<"organizations">,
  expectedSportType: SupportedSportType,
) {
  const actualSportType = await getOrganizationSportType(ctx, organizationId);

  if (actualSportType !== expectedSportType) {
    throw new Error(
      `This function is only available for ${expectedSportType} leagues`,
    );
  }

  return actualSportType;
}
