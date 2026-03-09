import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser } from "./auth";
import { resolveOrganizationBySlug } from "./organizationResolver";
import { isSingleTenantMode } from "./tenancy";

type PermissionCtx = QueryCtx | MutationCtx;

/**
 * Get user's membership in a specific organization.
 */
export async function getOrgMembership(
  ctx: PermissionCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
) {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("byUserAndOrg", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId),
    )
    .unique();
}

/**
 * Check if user has admin access to a specific organization.
 * Returns true if user is a global superadmin OR has admin/superadmin role in the org.
 */
export async function hasOrgAdminAccess(
  ctx: PermissionCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (user?.isSuperAdmin) {
    return true;
  }

  const membership = await getOrgMembership(ctx, userId, organizationId);
  return membership?.role === "admin" || membership?.role === "superadmin";
}

/**
 * Get staff assignment for a user in a specific club.
 */
export async function getStaffAssignment(
  ctx: PermissionCtx,
  userId: Id<"users">,
  clubId: Id<"clubs">,
) {
  return await ctx.db
    .query("staff")
    .withIndex("byUser", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("clubId"), clubId))
    .first();
}

/**
 * Check if user has staff-level access to a specific club.
 */
export async function hasClubStaffAccess(
  ctx: PermissionCtx,
  userId: Id<"users">,
  clubId: Id<"clubs">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (user?.isSuperAdmin) {
    return true;
  }

  const staffAssignment = await getStaffAssignment(ctx, userId, clubId);
  return Boolean(staffAssignment);
}

/**
 * Check if user can access a specific club.
 * Access is granted to org admins/superadmins or club staff assignments.
 */
export async function hasClubAccess(
  ctx: PermissionCtx,
  userId: Id<"users">,
  clubId: Id<"clubs">,
): Promise<boolean> {
  const club = await ctx.db.get(clubId);
  if (!club) {
    return false;
  }

  if (await hasOrgAdminAccess(ctx, userId, club.organizationId)) {
    return true;
  }

  return await hasClubStaffAccess(ctx, userId, clubId);
}

/**
 * Require that the current user is a global SuperAdmin.
 * Throws if not authenticated or not a SuperAdmin.
 */
export async function requireSuperAdmin(ctx: PermissionCtx) {
  const user = await getCurrentUser(ctx);

  if (!user.isSuperAdmin) {
    throw new Error("SuperAdmin access required");
  }

  return user;
}

/**
 * Require that the current user has access to the specified organization.
 * Returns the user and their membership (membership may be null for global superadmins).
 */
export async function requireOrgAccess(
  ctx: PermissionCtx,
  organizationSlug: string,
) {
  const user = await getCurrentUser(ctx);

  let organization = await resolveOrganizationBySlug(ctx, organizationSlug);

  if (!organization && isSingleTenantMode()) {
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    const organizationIds = [
      ...new Set(memberships.map((m) => m.organizationId)),
    ];
    if (organizationIds.length === 1) {
      organization = await ctx.db.get(organizationIds[0]);
    }
  }

  if (!organization) {
    throw new Error(`Organization "${organizationSlug}" not found`);
  }

  const membership = await getOrgMembership(ctx, user._id, organization._id);

  if (user.isSuperAdmin) {
    return { user, organization, membership };
  }

  if (!membership) {
    throw new Error("You do not have access to this organization");
  }

  return { user, organization, membership };
}

/**
 * Require that the current user has admin access (admin or superadmin) to the organization.
 */
export async function requireOrgAdmin(
  ctx: PermissionCtx,
  organizationSlug: string,
) {
  const { user, organization, membership } = await requireOrgAccess(
    ctx,
    organizationSlug,
  );

  if (user.isSuperAdmin) {
    return { user, organization, membership };
  }

  if (
    !membership ||
    (membership.role !== "admin" && membership.role !== "superadmin")
  ) {
    throw new Error("Admin access required for this action");
  }

  return { user, organization, membership };
}

/**
 * Require that current user can access a club via organization admin role or staff assignment.
 */
export async function requireClubAccess(
  ctx: PermissionCtx,
  clubId: Id<"clubs">,
) {
  const user = await getCurrentUser(ctx);
  const club = await ctx.db.get(clubId);
  if (!club) {
    throw new Error("Club not found");
  }

  const organization = await ctx.db.get(club.organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  if (user.isSuperAdmin) {
    return {
      user,
      organization,
      club,
      membership: null,
      staffAssignment: null,
      accessLevel: "superadmin" as const,
    };
  }

  const membership = await getOrgMembership(ctx, user._id, organization._id);
  const isOrgAdmin =
    membership?.role === "admin" || membership?.role === "superadmin";
  if (isOrgAdmin) {
    return {
      user,
      organization,
      club,
      membership,
      staffAssignment: null,
      accessLevel: "admin" as const,
    };
  }

  const staffAssignment = await getStaffAssignment(ctx, user._id, club._id);
  if (staffAssignment) {
    return {
      user,
      organization,
      club,
      membership,
      staffAssignment,
      accessLevel: "coach" as const,
    };
  }

  throw new Error("You do not have access to this team");
}

/**
 * Require that current user can access a club by slug.
 */
export async function requireClubAccessBySlug(
  ctx: PermissionCtx,
  clubSlug: string,
) {
  const club = await ctx.db
    .query("clubs")
    .withIndex("bySlug", (q) => q.eq("slug", clubSlug))
    .unique();

  if (!club) {
    throw new Error("Club not found");
  }

  return await requireClubAccess(ctx, club._id);
}
