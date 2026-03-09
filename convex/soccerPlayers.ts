import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { ensureOrganizationSportType } from "./lib/sports";
import { requireClubAccess } from "./lib/permissions";

const playerGender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);
const dominantProfile = v.union(
  v.literal("right"),
  v.literal("left"),
  v.literal("both"),
);

export const createPlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    secondLastName: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    dateOfBirth: v.string(),
    documentNumber: v.string(),
    gender: playerGender,
    country: v.string(),
    categoryId: v.id("categories"),
    position: v.string(),
    height: v.number(),
    weight: v.number(),
    cometNumber: v.string(),
    fifaId: v.optional(v.string()),
    dominantProfile: dominantProfile,
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const { club, organization } = await requireClubAccess(
      ctx,
      category.clubId,
    );
    await ensureOrganizationSportType(ctx, organization._id, "soccer");

    const playerId = await ctx.db.insert("players", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      secondLastName: args.secondLastName?.trim() || undefined,
      photoStorageId: args.photoStorageId,
      dateOfBirth: args.dateOfBirth,
      documentNumber: args.documentNumber.trim(),
      gender: args.gender,
      country: args.country.trim(),
      clubId: club._id,
      categoryId: args.categoryId,
      sportType: "soccer",
      position: args.position.trim(),
      height: args.height,
      weight: args.weight,
      status: "active",
    });

    await ctx.db.insert("soccerPlayerProfiles", {
      playerId,
      cometNumber: args.cometNumber.trim(),
      fifaId: args.fifaId?.trim() || undefined,
      dominantProfile: args.dominantProfile,
    });

    return playerId;
  },
});

export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    secondLastName: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    gender: v.optional(playerGender),
    country: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    position: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    cometNumber: v.optional(v.string()),
    fifaId: v.optional(v.string()),
    dominantProfile: v.optional(dominantProfile),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player || player.sportType !== "soccer") {
      throw new Error("Player not found");
    }

    const { organization } = await requireClubAccess(ctx, player.clubId);
    await ensureOrganizationSportType(ctx, organization._id, "soccer");

    const { playerId, cometNumber, fifaId, dominantProfile, ...rawUpdates } =
      args;
    const filteredUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawUpdates)) {
      if (value === undefined) {
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          continue;
        }
        filteredUpdates[key] = trimmed;
        continue;
      }

      filteredUpdates[key] = value;
    }

    if (args.categoryId) {
      const targetCategory = await ctx.db.get(args.categoryId);
      if (!targetCategory) {
        throw new Error("Category not found");
      }

      const targetAccess = await requireClubAccess(ctx, targetCategory.clubId);
      await ensureOrganizationSportType(
        ctx,
        targetAccess.organization._id,
        "soccer",
      );
      filteredUpdates.clubId = targetCategory.clubId;
    }

    if (
      filteredUpdates.photoStorageId &&
      player.photoStorageId &&
      filteredUpdates.photoStorageId !== player.photoStorageId
    ) {
      await ctx.storage.delete(player.photoStorageId);
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(playerId, filteredUpdates);
    }

    const existingProfile = await ctx.db
      .query("soccerPlayerProfiles")
      .withIndex("byPlayer", (q) => q.eq("playerId", playerId))
      .unique();

    const profileUpdates: Partial<{
      cometNumber: string;
      fifaId: string;
      dominantProfile: "right" | "left" | "both";
    }> = {};
    if (cometNumber !== undefined) {
      profileUpdates.cometNumber = cometNumber.trim();
    }
    if (fifaId !== undefined) {
      const trimmedFifaId = fifaId.trim();
      if (trimmedFifaId) {
        profileUpdates.fifaId = trimmedFifaId;
      }
    }
    if (dominantProfile !== undefined) {
      profileUpdates.dominantProfile = dominantProfile;
    }

    if (existingProfile) {
      if (Object.keys(profileUpdates).length > 0) {
        await ctx.db.patch(existingProfile._id, profileUpdates);
      }
    } else {
      if (!profileUpdates.cometNumber || !profileUpdates.dominantProfile) {
        throw new Error("Soccer player profile is incomplete");
      }

      await ctx.db.insert("soccerPlayerProfiles", {
        playerId,
        cometNumber: profileUpdates.cometNumber,
        ...(profileUpdates.fifaId ? { fifaId: profileUpdates.fifaId } : {}),
        dominantProfile: profileUpdates.dominantProfile,
      });
    }

    return null;
  },
});
