import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { getCurrentUser } from "./auth";
import { hasClubStaffAccess, hasOrgAdminAccess } from "./permissions";

type GamePermissionCtx = QueryCtx | MutationCtx;

export async function requireGameAccess(
  ctx: GamePermissionCtx,
  game: {
    organizationId: Id<"organizations">;
    homeClubId: Id<"clubs">;
    awayClubId: Id<"clubs">;
  },
) {
  const user = await getCurrentUser(ctx);
  if (user.isSuperAdmin) {
    return user;
  }

  const isOrgAdmin = await hasOrgAdminAccess(
    ctx,
    user._id,
    game.organizationId,
  );
  if (isOrgAdmin) {
    return user;
  }

  const [homeAccess, awayAccess] = await Promise.all([
    hasClubStaffAccess(ctx, user._id, game.homeClubId),
    hasClubStaffAccess(ctx, user._id, game.awayClubId),
  ]);

  if (!homeAccess && !awayAccess) {
    throw new Error("You do not have access to this game");
  }

  return user;
}

export async function requireGameAdminAccess(
  ctx: GamePermissionCtx,
  organizationId: Id<"organizations">,
) {
  const user = await getCurrentUser(ctx);
  if (user.isSuperAdmin) {
    return user;
  }

  const isOrgAdmin = await hasOrgAdminAccess(ctx, user._id, organizationId);
  if (!isOrgAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}
