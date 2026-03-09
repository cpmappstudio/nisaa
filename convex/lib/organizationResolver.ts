import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { DEFAULT_TENANT_SLUG, isSingleTenantMode } from "./tenancy";

type ResolverCtx = QueryCtx | MutationCtx;

export async function resolveOrganizationBySlug(
  ctx: ResolverCtx,
  slug: string,
): Promise<Doc<"organizations"> | null> {
  const directMatch = await ctx.db
    .query("organizations")
    .withIndex("bySlug", (q) => q.eq("slug", slug))
    .unique();

  if (directMatch) {
    return directMatch;
  }

  if (!isSingleTenantMode()) {
    return null;
  }

  const organizations = await ctx.db.query("organizations").collect();
  const syntheticOrganizations = organizations.filter((organization) =>
    organization.clerkOrgId.startsWith("single:"),
  );

  if (organizations.length === 1) {
    return organizations[0];
  }

  if (syntheticOrganizations.length === 1) {
    return syntheticOrganizations[0];
  }

  if (slug === DEFAULT_TENANT_SLUG) {
    const syntheticDefault = organizations.find(
      (organization) =>
        organization.clerkOrgId === `single:${DEFAULT_TENANT_SLUG}`,
    );
    if (syntheticDefault) {
      return syntheticDefault;
    }
  }

  const syntheticDefault = organizations.find(
    (organization) => organization.clerkOrgId === `single:${slug}`,
  );
  if (syntheticDefault) {
    return syntheticDefault;
  }

  return null;
}
