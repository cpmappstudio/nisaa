import "server-only";

import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAuthToken } from "@/lib/auth/auth";

export async function ensureCurrentUserSynced(token?: string) {
  const resolvedToken = token ?? (await getAuthToken());
  if (!resolvedToken) {
    return null;
  }

  return await fetchAction(api.users.syncCurrentUser, {}, { token: resolvedToken });
}
