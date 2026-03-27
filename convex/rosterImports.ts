import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const gender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const clubStatus = v.union(
  v.literal("affiliated"),
  v.literal("invited"),
  v.literal("suspended"),
);

const importPlayerValidator = v.object({
  fullName: v.string(),
  jerseyNumber: v.optional(v.number()),
  rawPosition: v.optional(v.string()),
  sourceLine: v.optional(v.string()),
});

const importTeamValidator = v.object({
  sourceFile: v.string(),
  sourceHeader: v.string(),
  teamName: v.string(),
  slug: v.string(),
  coachName: v.optional(v.string()),
  players: v.array(importPlayerValidator),
});

const importSummaryValidator = v.object({
  sourceFile: v.string(),
  teamName: v.string(),
  slug: v.string(),
  finalSlug: v.string(),
  clubId: v.optional(v.id("clubs")),
  categoryId: v.optional(v.id("categories")),
  clubAction: v.union(
    v.literal("created"),
    v.literal("updated"),
    v.literal("reused"),
  ),
  categoryAction: v.union(
    v.literal("created"),
    v.literal("updated"),
    v.literal("reused"),
  ),
  playersCreated: v.number(),
  playersUpdated: v.number(),
  playersSkipped: v.number(),
  warnings: v.array(v.string()),
});

function assertImportSecret(secret: string) {
  const expected =
    process.env.ROSTER_IMPORT_SECRET ?? process.env.LEGACY_MIGRATION_SECRET;

  if (!expected) {
    throw new Error(
      "ROSTER_IMPORT_SECRET or LEGACY_MIGRATION_SECRET must be configured",
    );
  }

  if (secret !== expected) {
    throw new Error("Invalid roster import secret");
  }
}

function normalizeSpaces(value: string): string {
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nicknameify(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizePositionKey(value: string): string {
  return normalizeSpaces(value).replaceAll("\\", "/").toUpperCase();
}

function splitPlayerName(fullName: string) {
  const normalized = normalizeSpaces(fullName);
  if (!normalized) {
    return { firstName: "Unknown", lastName: "" };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildPlayerNameKey(args: { firstName: string; lastName: string }) {
  return normalizeKey(`${args.firstName} ${args.lastName}`);
}

async function resolveUniqueClubSlug(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  requestedSlug: string,
) {
  const baseSlug = slugify(requestedSlug);
  if (!baseSlug) {
    throw new Error("A valid team slug is required");
  }

  let suffix = 0;
  while (suffix < 1000) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const existing = await ctx.db
      .query("clubs")
      .withIndex("bySlug", (q) => q.eq("slug", candidate))
      .unique();

    if (!existing || existing.organizationId === orgId) {
      return {
        slug: candidate,
        existingClub: existing ?? null,
      };
    }

    suffix += 1;
  }

  throw new Error(`Unable to allocate a unique slug for "${requestedSlug}"`);
}

function buildPositionResolvers(
  positions:
    | Array<{
        id: string;
        name: string;
        abbreviation: string;
      }>
    | undefined,
) {
  const byAbbreviation = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const position of positions ?? []) {
    byAbbreviation.set(
      normalizePositionKey(position.abbreviation),
      position.id,
    );
    byName.set(normalizeKey(position.name), position.id);
  }

  return {
    resolve(rawPosition: string | undefined) {
      if (!rawPosition) {
        return {
          storedValue: undefined,
          matchedConfig: false,
        };
      }

      const normalizedAbbreviation = normalizePositionKey(rawPosition);
      const normalizedName = normalizeKey(rawPosition);

      const mappedId =
        byAbbreviation.get(normalizedAbbreviation) ??
        byName.get(normalizedName);

      if (mappedId) {
        return {
          storedValue: mappedId,
          matchedConfig: true,
        };
      }

      return {
        storedValue: normalizeSpaces(rawPosition).replaceAll("\\", "/"),
        matchedConfig: false,
      };
    },
  };
}

function getExactCategoryMatch(
  categories: Array<{
    _id: Id<"categories">;
    name: string;
    ageGroup: string;
    gender: "male" | "female" | "mixed";
    status: "active" | "inactive";
  }>,
  target: {
    name: string;
    ageGroup: string;
    gender: "male" | "female" | "mixed";
  },
) {
  const normalizedName = normalizeKey(target.name);
  const normalizedAgeGroup = normalizeKey(target.ageGroup);

  return (
    categories.find(
      (category) =>
        normalizeKey(category.name) === normalizedName &&
        normalizeKey(category.ageGroup) === normalizedAgeGroup &&
        category.gender === target.gender,
    ) ?? null
  );
}

function matchExistingPlayer(
  players: Array<{
    _id: Id<"players">;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    categoryId: Id<"categories">;
  }>,
  importedPlayer: {
    fullName: string;
    jerseyNumber?: number;
  },
) {
  const normalizedImportedName = normalizeKey(importedPlayer.fullName);
  const byName = players.filter(
    (player) =>
      buildPlayerNameKey({
        firstName: player.firstName,
        lastName: player.lastName,
      }) === normalizedImportedName,
  );

  if (importedPlayer.jerseyNumber !== undefined) {
    const exactJerseyMatches = byName.filter(
      (player) => player.jerseyNumber === importedPlayer.jerseyNumber,
    );

    if (exactJerseyMatches.length === 1) {
      return { player: exactJerseyMatches[0], ambiguous: false };
    }

    if (exactJerseyMatches.length > 1) {
      return { player: null, ambiguous: true };
    }
  }

  if (byName.length === 1) {
    return { player: byName[0], ambiguous: false };
  }

  if (byName.length > 1) {
    return { player: null, ambiguous: true };
  }

  return { player: null, ambiguous: false };
}

export const importPdfRosters = mutation({
  args: {
    secret: v.string(),
    orgSlug: v.string(),
    dryRun: v.optional(v.boolean()),
    defaults: v.object({
      categoryName: v.string(),
      ageGroup: v.string(),
      gender: gender,
      clubStatus: clubStatus,
    }),
    teams: v.array(importTeamValidator),
  },
  returns: v.object({
    dryRun: v.boolean(),
    totals: v.object({
      clubsCreated: v.number(),
      clubsUpdated: v.number(),
      clubsReused: v.number(),
      categoriesCreated: v.number(),
      categoriesUpdated: v.number(),
      categoriesReused: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      playersSkipped: v.number(),
    }),
    teams: v.array(importSummaryValidator),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    assertImportSecret(args.secret);

    const organization = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!organization) {
      throw new Error(`Organization "${args.orgSlug}" not found`);
    }

    const dryRun = Boolean(args.dryRun);
    const defaults = {
      categoryName: normalizeSpaces(args.defaults.categoryName),
      ageGroup: normalizeSpaces(args.defaults.ageGroup),
      gender: args.defaults.gender,
      clubStatus: args.defaults.clubStatus,
    };

    if (!defaults.categoryName || !defaults.ageGroup) {
      throw new Error("categoryName and ageGroup are required");
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("byOrganization", (q) =>
        q.eq("organizationId", organization._id),
      )
      .unique();
    const positionResolvers = buildPositionResolvers(settings?.positions);

    const summaries: Array<{
      sourceFile: string;
      teamName: string;
      slug: string;
      finalSlug: string;
      clubId?: Id<"clubs">;
      categoryId?: Id<"categories">;
      clubAction: "created" | "updated" | "reused";
      categoryAction: "created" | "updated" | "reused";
      playersCreated: number;
      playersUpdated: number;
      playersSkipped: number;
      warnings: string[];
    }> = [];
    const globalWarnings: string[] = [];

    const totals = {
      clubsCreated: 0,
      clubsUpdated: 0,
      clubsReused: 0,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      categoriesReused: 0,
      playersCreated: 0,
      playersUpdated: 0,
      playersSkipped: 0,
    };

    for (const team of args.teams) {
      const requestedTeamName = normalizeSpaces(team.teamName);
      const sourceSlug = slugify(team.slug || team.teamName);
      const desiredNickname = nicknameify(team.teamName);
      const teamWarnings: string[] = [];

      if (!requestedTeamName || !sourceSlug || !desiredNickname) {
        throw new Error(`Invalid team payload in "${team.sourceFile}"`);
      }

      const clubsInOrganization = await ctx.db
        .query("clubs")
        .withIndex("byOrganization", (q) =>
          q.eq("organizationId", organization._id),
        )
        .collect();
      const existingClub =
        clubsInOrganization.find(
          (club) =>
            club.slug === sourceSlug ||
            club.slug === desiredNickname ||
            normalizeSpaces(club.name) === requestedTeamName,
        ) ?? null;
      const { slug: finalSlug } = existingClub
        ? { slug: desiredNickname }
        : await resolveUniqueClubSlug(ctx, organization._id, desiredNickname);

      let clubId = existingClub?._id;
      let clubAction: "created" | "updated" | "reused" = existingClub
        ? "reused"
        : "created";

      if (!existingClub) {
        if (!dryRun) {
          clubId = await ctx.db.insert("clubs", {
            organizationId: organization._id,
            name: requestedTeamName,
            slug: finalSlug,
            nickname: desiredNickname,
            status: defaults.clubStatus,
          });
        }
        totals.clubsCreated += 1;
      } else {
        const clubPatch: Partial<{
          name: string;
          nickname: string;
          slug: string;
          status: "affiliated" | "invited" | "suspended";
        }> = {};

        if (normalizeSpaces(existingClub.name) !== requestedTeamName) {
          clubPatch.name = requestedTeamName;
        }
        if ((existingClub.nickname ?? "") !== desiredNickname) {
          clubPatch.nickname = desiredNickname;
        }
        if (existingClub.slug !== finalSlug) {
          clubPatch.slug = finalSlug;
        }
        if (existingClub.status !== defaults.clubStatus) {
          clubPatch.status = defaults.clubStatus;
        }

        if (Object.keys(clubPatch).length > 0) {
          clubAction = "updated";
          totals.clubsUpdated += 1;
          if (!dryRun) {
            await ctx.db.patch(existingClub._id, clubPatch);
          }
        } else {
          totals.clubsReused += 1;
        }
      }

      let categoryId: Id<"categories"> | undefined;
      let categoryAction: "created" | "updated" | "reused" = existingClub
        ? "reused"
        : "created";
      const resolvedClubId = clubId ?? existingClub?._id;

      if (resolvedClubId) {
        const categories = await ctx.db
          .query("categories")
          .withIndex("byClub", (q) => q.eq("clubId", resolvedClubId))
          .collect();

        const existingCategory = getExactCategoryMatch(categories, {
          name: defaults.categoryName,
          ageGroup: defaults.ageGroup,
          gender: defaults.gender,
        });

        if (existingCategory) {
          categoryId = existingCategory._id;
          if (existingCategory.status !== "active") {
            categoryAction = "updated";
            totals.categoriesUpdated += 1;
            if (!dryRun) {
              await ctx.db.patch(existingCategory._id, {
                status: "active",
              });
            }
          } else {
            totals.categoriesReused += 1;
          }
        } else {
          categoryAction = "created";
          totals.categoriesCreated += 1;
          if (!dryRun) {
            categoryId = await ctx.db.insert("categories", {
              clubId: resolvedClubId,
              name: defaults.categoryName,
              ageGroup: defaults.ageGroup,
              gender: defaults.gender,
              status: "active",
            });
          }
        }
      }

      let playersCreated = 0;
      let playersUpdated = 0;
      let playersSkipped = 0;

      if (!resolvedClubId) {
        if (categoryAction === "created") {
          totals.categoriesCreated += 1;
        }
        playersCreated = team.players.length;
      } else if (categoryId || dryRun) {
        const existingPlayers = await ctx.db
          .query("players")
          .withIndex("byClub", (q) => q.eq("clubId", resolvedClubId))
          .collect();
        const workingPlayers = [...existingPlayers];

        for (const importedPlayer of team.players) {
          const normalizedFullName = normalizeSpaces(importedPlayer.fullName);
          if (!normalizedFullName) {
            playersSkipped += 1;
            teamWarnings.push(
              `Skipped empty player row in "${team.sourceFile}" (${importedPlayer.sourceLine ?? "unknown line"})`,
            );
            continue;
          }

          const { firstName, lastName } = splitPlayerName(normalizedFullName);
          const positionResolution = positionResolvers.resolve(
            importedPlayer.rawPosition,
          );

          if (importedPlayer.rawPosition && !positionResolution.matchedConfig) {
            teamWarnings.push(
              `Position "${importedPlayer.rawPosition}" for ${normalizedFullName} is not configured in leagueSettings; stored as raw text`,
            );
          }

          const match = matchExistingPlayer(workingPlayers, {
            fullName: normalizedFullName,
            jerseyNumber: importedPlayer.jerseyNumber,
          });

          if (match.ambiguous) {
            playersSkipped += 1;
            teamWarnings.push(
              `Skipped ${normalizedFullName} because multiple existing players matched in club "${requestedTeamName}"`,
            );
            continue;
          }

          if (match.player) {
            playersUpdated += 1;
            if (!dryRun) {
              await ctx.db.patch(match.player._id, {
                firstName,
                lastName,
                categoryId: categoryId ?? match.player.categoryId,
                jerseyNumber: importedPlayer.jerseyNumber,
                position: positionResolution.storedValue,
                status: "active",
              });
            }
            const workingIndex = workingPlayers.findIndex(
              (player) => player._id === match.player!._id,
            );
            if (workingIndex >= 0) {
              workingPlayers[workingIndex] = {
                ...workingPlayers[workingIndex],
                firstName,
                lastName,
                jerseyNumber: importedPlayer.jerseyNumber,
                categoryId:
                  categoryId ?? workingPlayers[workingIndex].categoryId,
                position: positionResolution.storedValue,
                status: "active",
              };
            }
            continue;
          }

          playersCreated += 1;
          if (!dryRun) {
            const newPlayerId = await ctx.db.insert("players", {
              firstName,
              lastName,
              clubId: resolvedClubId,
              categoryId: categoryId!,
              sportType: "basketball",
              jerseyNumber: importedPlayer.jerseyNumber,
              position: positionResolution.storedValue,
              status: "active",
            });

            workingPlayers.push({
              _id: newPlayerId,
              firstName,
              lastName,
              jerseyNumber: importedPlayer.jerseyNumber,
              categoryId: categoryId!,
              clubId: resolvedClubId,
              sportType: "basketball",
              position: positionResolution.storedValue,
              status: "active",
              _creationTime: Date.now(),
            });
          }
        }
      } else {
        playersSkipped += team.players.length;
        teamWarnings.push(
          `Skipped ${team.players.length} players because the club/category could not be resolved`,
        );
      }

      totals.playersCreated += playersCreated;
      totals.playersUpdated += playersUpdated;
      totals.playersSkipped += playersSkipped;

      summaries.push({
        sourceFile: team.sourceFile,
        teamName: requestedTeamName,
        slug: sourceSlug,
        finalSlug,
        clubId,
        categoryId,
        clubAction,
        categoryAction,
        playersCreated,
        playersUpdated,
        playersSkipped,
        warnings: teamWarnings,
      });
      globalWarnings.push(
        ...teamWarnings.map((warning) => `${team.sourceFile}: ${warning}`),
      );
    }

    return {
      dryRun,
      totals,
      teams: summaries,
      warnings: globalWarnings,
    };
  },
});
