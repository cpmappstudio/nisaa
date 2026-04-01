import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  DEFAULT_DIVISION,
  buildCategoryName,
  deriveDivisionFromCategoryName,
  findLeagueAgeCategoryByAgeGroup,
  normalizeAgeGroup,
  normalizeDivision,
  normalizeSpaces,
  renameCategoryNameForLeagueAgeGroup,
} from "../../../lib/basketball/categories";

type CategoriesCtx = QueryCtx | MutationCtx;
type CategoryGender = "male" | "female" | "mixed";

interface HorizontalDivisionsConfig {
  enabled: boolean;
  type: "alphabetic" | "greek" | "numeric";
}

function findSemanticCategory(
  categories: Doc<"categories">[],
  args: {
    leagueCategoryId: string;
    ageGroup: string;
    gender: CategoryGender;
    division: string;
  },
) {
  const normalizedAge = normalizeAgeGroup(args.ageGroup);
  const normalizedDivisionValue = normalizeDivision(args.division);

  const exactMatch = categories.find(
    (category) =>
      category.leagueCategoryId === args.leagueCategoryId &&
      category.gender === args.gender &&
      normalizeDivision(
        deriveDivisionFromCategoryName(category.name, category.ageGroup),
      ) === normalizedDivisionValue,
  );
  if (exactMatch) {
    return exactMatch;
  }

  return categories.find(
    (category) =>
      !category.leagueCategoryId &&
      normalizeAgeGroup(category.ageGroup) === normalizedAge &&
      category.gender === args.gender &&
      normalizeDivision(
        deriveDivisionFromCategoryName(category.name, category.ageGroup),
      ) === normalizedDivisionValue,
  );
}

export async function getClubLeagueCategoryConfig(
  ctx: CategoriesCtx,
  clubId: Id<"clubs">,
) {
  const club = await ctx.db.get(clubId);
  if (!club) {
    throw new Error("Club not found");
  }

  const settings = await ctx.db
    .query("leagueSettings")
    .withIndex("byOrganization", (q) => q.eq("organizationId", club.organizationId))
    .unique();

  return {
    club,
    ageCategories: settings?.ageCategories ?? [],
    enabledGenders:
      settings?.enabledGenders ??
      (["male", "female"] as Array<"male" | "female" | "mixed">),
    horizontalDivisions:
      settings?.horizontalDivisions ??
      ({
        enabled: false,
        type: "alphabetic",
      } satisfies HorizontalDivisionsConfig),
  };
}

export function deriveCategorySelectionFromExistingClubCategory(args: {
  ageCategories: Array<{
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
  }>;
  category: Doc<"categories">;
}) {
  const leagueCategory = findLeagueAgeCategoryByAgeGroup(
    args.ageCategories,
    args.category.ageGroup,
  );
  const linkedLeagueCategory = args.category.leagueCategoryId
    ? (args.ageCategories.find(
        (category) => category.id === args.category.leagueCategoryId,
      ) ?? null)
    : null;

  return {
    leagueCategoryId: linkedLeagueCategory?.id ?? leagueCategory?.id ?? null,
    division: deriveDivisionFromCategoryName(
      args.category.name,
      args.category.ageGroup,
    ),
  };
}

export async function ensureClubCategoryForLeagueSelection(
  ctx: MutationCtx,
  args: {
    clubId: Id<"clubs">;
    leagueCategoryId: string;
    gender: CategoryGender;
    division?: string;
  },
) {
  const { club, ageCategories, enabledGenders, horizontalDivisions } =
    await getClubLeagueCategoryConfig(ctx, args.clubId);

  if (!enabledGenders.includes(args.gender)) {
    throw new Error("Selected gender is not enabled for this league");
  }

  const leagueCategory =
    ageCategories.find((category) => category.id === args.leagueCategoryId) ??
    null;
  if (!leagueCategory) {
    throw new Error("Selected league category not found");
  }

  const explicitDivision = args.division ? normalizeSpaces(args.division) : "";

  if (horizontalDivisions.enabled && !explicitDivision) {
    throw new Error(
      "Division is required when horizontal divisions are enabled",
    );
  }

  const normalizedDivisionValue = explicitDivision || DEFAULT_DIVISION;

  const categories = await ctx.db
    .query("categories")
    .withIndex("byClub", (q) => q.eq("clubId", club._id))
    .collect();

  const existingCategory = findSemanticCategory(categories, {
    leagueCategoryId: args.leagueCategoryId,
    ageGroup: leagueCategory.name,
    gender: args.gender,
    division: normalizedDivisionValue,
  });

  if (existingCategory) {
    const nextCategoryName = renameCategoryNameForLeagueAgeGroup(
      existingCategory.name,
      existingCategory.ageGroup,
      leagueCategory.name,
    );
    const updates: Partial<Doc<"categories">> = {};

    if (existingCategory.status !== "active") {
      updates.status = "active";
    }
    if (existingCategory.leagueCategoryId !== args.leagueCategoryId) {
      updates.leagueCategoryId = args.leagueCategoryId;
    }
    if (existingCategory.ageGroup !== leagueCategory.name) {
      updates.ageGroup = leagueCategory.name;
    }
    if (existingCategory.name !== nextCategoryName) {
      updates.name = nextCategoryName;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(existingCategory._id, updates);
    }

    return {
      categoryId: existingCategory._id,
      ageGroup: leagueCategory.name,
      division: normalizedDivisionValue,
    };
  }

  const categoryId = await ctx.db.insert("categories", {
    clubId: club._id,
    leagueCategoryId: args.leagueCategoryId,
    name: buildCategoryName(leagueCategory.name, normalizedDivisionValue, {
      includeDivision:
        horizontalDivisions.enabled ||
        normalizeDivision(normalizedDivisionValue) !==
          normalizeDivision(DEFAULT_DIVISION),
    }),
    ageGroup: leagueCategory.name,
    gender: args.gender,
    status: "active",
  });

  return {
    categoryId,
    ageGroup: leagueCategory.name,
    division: normalizedDivisionValue,
  };
}

export async function syncClubCategoriesForLeagueCategoryRename(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    leagueCategoryId: string;
    previousAgeGroup: string;
    nextAgeGroup: string;
  },
) {
  const clubs = await ctx.db
    .query("clubs")
    .withIndex("byOrganization", (q) =>
      q.eq("organizationId", args.organizationId),
    )
    .collect();

  for (const club of clubs) {
    const categories = await ctx.db
      .query("categories")
      .withIndex("byClub", (q) => q.eq("clubId", club._id))
      .collect();

    for (const category of categories) {
      const matchesLeagueCategory =
        category.leagueCategoryId === args.leagueCategoryId ||
        (!category.leagueCategoryId &&
          normalizeAgeGroup(category.ageGroup) ===
            normalizeAgeGroup(args.previousAgeGroup));

      if (!matchesLeagueCategory) {
        continue;
      }

      const nextCategoryName = renameCategoryNameForLeagueAgeGroup(
        category.name,
        category.ageGroup,
        args.nextAgeGroup,
      );
      const updates: Partial<Doc<"categories">> = {};

      if (category.leagueCategoryId !== args.leagueCategoryId) {
        updates.leagueCategoryId = args.leagueCategoryId;
      }
      if (category.ageGroup !== args.nextAgeGroup) {
        updates.ageGroup = args.nextAgeGroup;
      }
      if (category.name !== nextCategoryName) {
        updates.name = nextCategoryName;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(category._id, updates);
      }
    }
  }
}
