import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type SoccerPlayerProfileSnapshot = {
  cometNumber?: string;
  fifaId?: string;
  dominantProfile?: "right" | "left" | "both";
};

export async function loadSoccerProfilesByPlayerIds(
  ctx: QueryCtx,
  playerIds: Array<Id<"players">>,
): Promise<Map<Id<"players">, SoccerPlayerProfileSnapshot>> {
  const uniquePlayerIds = [...new Set(playerIds)];
  const profilesByPlayerId = new Map<Id<"players">, SoccerPlayerProfileSnapshot>();

  for (const playerId of uniquePlayerIds) {
    const profile = await ctx.db
      .query("soccerPlayerProfiles")
      .withIndex("byPlayer", (q) => q.eq("playerId", playerId))
      .unique();

    if (!profile) {
      continue;
    }

    profilesByPlayerId.set(playerId, {
      cometNumber: profile.cometNumber,
      fifaId: profile.fifaId,
      dominantProfile: profile.dominantProfile,
    });
  }

  return profilesByPlayerId;
}
