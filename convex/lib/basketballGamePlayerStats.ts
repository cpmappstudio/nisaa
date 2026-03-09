import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

type BasketballStatsReadCtx = QueryCtx | MutationCtx;
type BasketballStatsWriteCtx = MutationCtx;

export type BasketballGamePlayerStatRecord = Doc<"basketballGamePlayerStats">;
export type BasketballGamePlayerStatInsert = Omit<
  BasketballGamePlayerStatRecord,
  "_id" | "_creationTime"
>;

export async function listBasketballGamePlayerStatsByGame(
  ctx: BasketballStatsReadCtx,
  gameId: Id<"games">,
) {
  return await ctx.db
    .query("basketballGamePlayerStats")
    .withIndex("byGame", (q) => q.eq("gameId", gameId))
    .collect();
}

export async function listBasketballGamePlayerStatsByPlayer(
  ctx: BasketballStatsReadCtx,
  playerId: Id<"players">,
) {
  return await ctx.db
    .query("basketballGamePlayerStats")
    .withIndex("byPlayer", (q) => q.eq("playerId", playerId))
    .collect();
}

export async function listBasketballGamePlayerStatsByGameAndClub(
  ctx: BasketballStatsReadCtx,
  gameId: Id<"games">,
  clubId: Id<"clubs">,
) {
  return await ctx.db
    .query("basketballGamePlayerStats")
    .withIndex("byGameAndClub", (q) =>
      q.eq("gameId", gameId).eq("clubId", clubId),
    )
    .collect();
}

export async function insertBasketballGamePlayerStat(
  ctx: BasketballStatsWriteCtx,
  stat: BasketballGamePlayerStatInsert,
) {
  return await ctx.db.insert("basketballGamePlayerStats", stat);
}

export async function deleteBasketballGamePlayerStats(
  ctx: BasketballStatsWriteCtx,
  stats: BasketballGamePlayerStatRecord[],
) {
  for (const stat of stats) {
    await ctx.db.delete(stat._id);
  }
}

export async function deleteBasketballGamePlayerStatsByGame(
  ctx: BasketballStatsWriteCtx,
  gameId: Id<"games">,
) {
  const stats = await listBasketballGamePlayerStatsByGame(ctx, gameId);
  await deleteBasketballGamePlayerStats(ctx, stats);
  return stats;
}

export async function deleteBasketballGamePlayerStatsByGameAndClub(
  ctx: BasketballStatsWriteCtx,
  gameId: Id<"games">,
  clubId: Id<"clubs">,
) {
  const stats = await listBasketballGamePlayerStatsByGameAndClub(
    ctx,
    gameId,
    clubId,
  );
  await deleteBasketballGamePlayerStats(ctx, stats);
  return stats;
}
