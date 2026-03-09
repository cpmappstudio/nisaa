import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/backend";
import { internal } from "./_generated/api";
import { clerkClient } from "./clerk";
import { DEFAULT_TENANT_SLUG, isSingleTenantMode } from "./lib/tenancy";
import {
  metadataRoleFromResolvedRole,
  normalizeSingleTenantMetadataRole,
  resolveSingleTenantRoleFromMetadata,
  type SingleTenantResolvedRole,
} from "./lib/singleTenantRoles";

const CLERK_WEBHOOK_PATH = "/clerk-webhook";
const SINGLE_TENANT_MODE = isSingleTenantMode();

type PendingStaffInvite = {
  staffRole: string;
  clubId: string;
  categoryId?: string;
};

async function ensureSingleTenantMetadataRole(
  data: {
    id: string;
    public_metadata?: {
      role?: unknown;
      isSuperAdmin?: unknown;
      [key: string]: unknown;
    };
  },
  resolvedRole: SingleTenantResolvedRole,
) {
  const normalizedCurrentRole = normalizeSingleTenantMetadataRole(
    data.public_metadata?.role,
  );
  const desiredRole =
    normalizedCurrentRole ?? metadataRoleFromResolvedRole(resolvedRole);
  const hasCanonicalRole = data.public_metadata?.role === desiredRole;

  if (hasCanonicalRole) {
    return;
  }

  await clerkClient.users.updateUserMetadata(data.id, {
    publicMetadata: {
      ...(data.public_metadata ?? {}),
      role: desiredRole,
    },
  });
}

function getPendingStaffInvite(
  publicMetadata: unknown,
): PendingStaffInvite | null {
  if (!publicMetadata || typeof publicMetadata !== "object") {
    return null;
  }

  const pendingStaff = (publicMetadata as { pendingStaff?: unknown })
    .pendingStaff;
  if (!pendingStaff || typeof pendingStaff !== "object") {
    return null;
  }

  const staffRole = (pendingStaff as { staffRole?: unknown }).staffRole;
  const clubId = (pendingStaff as { clubId?: unknown }).clubId;
  const categoryId = (pendingStaff as { categoryId?: unknown }).categoryId;

  if (typeof staffRole !== "string" || typeof clubId !== "string") {
    return null;
  }

  return {
    staffRole,
    clubId,
    ...(typeof categoryId === "string" ? { categoryId } : {}),
  };
}

async function processPendingStaffInvite(args: {
  ctx: any;
  clerkUserId: string;
  publicMetadata: unknown;
}) {
  const pendingStaff = getPendingStaffInvite(args.publicMetadata);
  if (!pendingStaff) {
    return;
  }

  const user = await args.ctx.runQuery(internal.users.getByClerkId, {
    clerkId: args.clerkUserId,
  });

  if (!user) {
    return;
  }

  await args.ctx.runMutation(internal.staff.createFromClerkMembership, {
    userId: user._id,
    clubId: pendingStaff.clubId,
    staffRole: pendingStaff.staffRole,
    ...(pendingStaff.categoryId ? { categoryId: pendingStaff.categoryId } : {}),
  });

  await clerkClient.users.updateUserMetadata(args.clerkUserId, {
    publicMetadata: {
      ...(args.publicMetadata as Record<string, unknown>),
      pendingStaff: undefined,
    },
  });
}

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateClerkRequest(request);
  if (!event) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        const resolvedRole = resolveSingleTenantRoleFromMetadata({
          role: event.data.public_metadata?.role,
          isSuperAdmin: event.data.public_metadata?.isSuperAdmin,
        });
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });

        if (SINGLE_TENANT_MODE) {
          await ensureSingleTenantMetadataRole(event.data, resolvedRole);
          await ctx.runMutation(internal.members.upsertFromSingleTenant, {
            clerkUserId: event.data.id,
            organizationSlug: DEFAULT_TENANT_SLUG,
            role: resolvedRole,
          });
          await processPendingStaffInvite({
            ctx,
            clerkUserId: event.data.id,
            publicMetadata: event.data.public_metadata,
          });
          break;
        }

        const pendingOrgSlug = event.data.unsafe_metadata
          ?.pendingOrganizationSlug as string | undefined;
        if (pendingOrgSlug) {
          const organizations =
            await clerkClient.organizations.getOrganizationList({
              query: pendingOrgSlug,
            });
          const organization = organizations.data.find(
            (item) => item.slug === pendingOrgSlug,
          );

          if (organization) {
            await clerkClient.organizations.createOrganizationMembership({
              organizationId: organization.id,
              userId: event.data.id,
              role: "org:member",
            });

            await clerkClient.users.updateUser(event.data.id, {
              unsafeMetadata: {
                ...event.data.unsafe_metadata,
                pendingOrganizationSlug: undefined,
              },
            });
          }
        }
        break;
      }

      case "user.updated": {
        const resolvedRole = resolveSingleTenantRoleFromMetadata({
          role: event.data.public_metadata?.role,
          isSuperAdmin: event.data.public_metadata?.isSuperAdmin,
        });
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });

        if (SINGLE_TENANT_MODE) {
          await ensureSingleTenantMetadataRole(event.data, resolvedRole);
          await ctx.runMutation(internal.members.upsertFromSingleTenant, {
            clerkUserId: event.data.id,
            organizationSlug: DEFAULT_TENANT_SLUG,
            role: resolvedRole,
          });
          await processPendingStaffInvite({
            ctx,
            clerkUserId: event.data.id,
            publicMetadata: event.data.public_metadata,
          });
        }
        break;
      }

      case "user.deleted":
        if (event.data?.id) {
          await ctx.runMutation(internal.users.deactivateUser, {
            clerkId: event.data.id,
          });
        }
        break;

      case "organization.created":
        if (SINGLE_TENANT_MODE) {
          break;
        }
        await ctx.runMutation(internal.organizations.createFromClerk, {
          clerkOrgId: event.data.id,
          name: event.data.name,
          slug: event.data.slug ?? event.data.id,
          imageUrl: event.data.image_url ?? undefined,
        });
        break;

      case "organization.updated":
        if (SINGLE_TENANT_MODE) {
          break;
        }
        await ctx.runMutation(internal.organizations.updateFromClerk, {
          clerkOrgId: event.data.id,
          name: event.data.name,
          slug: event.data.slug ?? event.data.id,
          imageUrl: event.data.image_url ?? undefined,
        });
        break;

      case "organization.deleted":
        if (SINGLE_TENANT_MODE) {
          break;
        }
        if (event.data.id) {
          await ctx.runMutation(internal.organizations.deleteFromClerk, {
            clerkOrgId: event.data.id,
          });
        }
        break;

      case "organizationMembership.created":
      case "organizationMembership.updated": {
        if (SINGLE_TENANT_MODE) {
          break;
        }

        const membershipResult = await ctx.runMutation(
          internal.members.upsertFromClerk,
          {
            data: event.data,
          },
        );

        const publicMetadata = event.data.public_metadata as
          | {
              staffRole?: string;
              clubId?: string;
              categoryId?: string;
            }
          | undefined;

        if (
          publicMetadata?.staffRole &&
          publicMetadata?.clubId &&
          membershipResult
        ) {
          const clerkUserId = event.data.public_user_data?.user_id;
          if (clerkUserId) {
            const user = await ctx.runQuery(internal.users.getByClerkId, {
              clerkId: clerkUserId,
            });

            if (user) {
              await ctx.runMutation(internal.staff.createFromClerkMembership, {
                userId: user._id,
                clubId: publicMetadata.clubId,
                staffRole: publicMetadata.staffRole,
                categoryId: publicMetadata.categoryId,
              });
            }
          }
        }
        break;
      }

      case "organizationMembership.deleted":
        if (SINGLE_TENANT_MODE) {
          break;
        }
        await ctx.runMutation(internal.members.deleteFromClerk, {
          data: event.data,
        });
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    console.error(`Webhook error: ${err.message}`);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

const http = httpRouter();

http.route({
  path: CLERK_WEBHOOK_PATH,
  method: "POST",
  handler: handleClerkWebhook,
});

async function validateClerkRequest(
  request: Request,
): Promise<WebhookEvent | undefined> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return undefined;
  }

  const payload = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") || "",
    "svix-timestamp": request.headers.get("svix-timestamp") || "",
    "svix-signature": request.headers.get("svix-signature") || "",
  };

  const wh = new Webhook(webhookSecret);
  try {
    return wh.verify(payload, svixHeaders) as WebhookEvent;
  } catch (err) {
    const error = err as Error;
    console.error(`Webhook verification failed: ${error.message}`);
    return undefined;
  }
}

export default http;
