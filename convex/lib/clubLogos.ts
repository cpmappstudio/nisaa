import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type ClubAssetCtx = QueryCtx | MutationCtx;

export async function loadClubsWithLogos(
  ctx: ClubAssetCtx,
  clubIds: Array<Id<"clubs">>,
) {
  const uniqueClubIds = [...new Set(clubIds)];
  const clubs = await Promise.all(uniqueClubIds.map((id) => ctx.db.get(id)));
  const clubEntries = clubs.filter((club): club is NonNullable<typeof club> =>
    Boolean(club),
  );
  const clubMap = new Map(clubEntries.map((club) => [club._id, club]));

  const logoEntries = await Promise.all(
    clubEntries.map(async (club) => {
      const logoUrl = club.logoStorageId
        ? ((await ctx.storage.getUrl(club.logoStorageId)) ?? undefined)
        : undefined;
      return [club._id, logoUrl] as const;
    }),
  );
  const clubLogoMap = new Map(logoEntries);

  return { clubMap, clubLogoMap };
}
