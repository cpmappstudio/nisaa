import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const orgMemberRole = v.union(
  v.literal("superadmin"),
  v.literal("admin"),
  v.literal("coach"),
  v.literal("member"),
);

const clubStatus = v.union(
  v.literal("affiliated"),
  v.literal("invited"),
  v.literal("suspended"),
);

const playerStatus = v.union(v.literal("active"), v.literal("inactive"));

const staffRole = v.union(
  v.literal("head_coach"),
  v.literal("technical_director"),
  v.literal("assistant_coach"),
);

const categoryStatus = v.union(v.literal("active"), v.literal("inactive"));

const gender = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const gameStatus = v.union(
  v.literal("scheduled"),
  v.literal("awaiting_stats"),
  v.literal("pending_review"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const sportType = v.union(v.literal("basketball"), v.literal("soccer"));

const positionValidator = v.object({
  id: v.string(),
  name: v.string(),
  abbreviation: v.string(),
});

const playerHighlightValidator = v.object({
  id: v.string(),
  title: v.string(),
  url: v.string(),
  videoId: v.string(),
});

const seasonValidator = v.object({
  id: v.string(),
  name: v.string(),
  startDate: v.string(),
  endDate: v.string(),
});

// ============================================================================
// CLERK SYNCED TABLES (from webhooks)
// ============================================================================

export default defineSchema({
  /**
   * Users - Synced from Clerk via webhooks.
   * All authenticated users: superadmins, admins, delegates, coaches, players.
   */
  users: defineTable({
    clerkId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    isSuperAdmin: v.boolean(),
  })
    .index("byClerkId", ["clerkId"])
    .index("byEmail", ["email"])
    .index("activeUsers", ["isActive"]),

  /**
   * Organizations - Synced from Clerk via webhooks.
   * Represents leagues/federations that own clubs.
   */
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("byClerkOrgId", ["clerkOrgId"])
    .index("bySlug", ["slug"]),

  /**
   * Organization Members - Synced from Clerk via webhooks.
   * Links users to organizations with roles.
   */
  organizationMembers: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    clerkMembershipId: v.string(),
    role: orgMemberRole,
  })
    .index("byUserId", ["userId"])
    .index("byOrganization", ["organizationId"])
    .index("byUserAndOrg", ["userId", "organizationId"])
    .index("byClerkMembershipId", ["clerkMembershipId"]),

  // ============================================================================
  // NISAA SPORTS TABLES
  // ============================================================================

  /**
   * Clubs - Teams within a league (organization).
   * delegateUserId is the user who manages this club.
   */
  clubs: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    nickname: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.array(v.string())),
    colorNames: v.optional(v.array(v.string())),
    status: clubStatus,
    delegateUserId: v.optional(v.id("users")),
  })
    .index("byOrganization", ["organizationId"])
    .index("bySlug", ["slug"])
    .index("byOrgAndSlug", ["organizationId", "slug"])
    .index("byDelegate", ["delegateUserId"]),

  /**
   * Categories - Age/skill level groups within a club.
   */
  categories: defineTable({
    clubId: v.id("clubs"),
    leagueCategoryId: v.optional(v.string()),
    name: v.string(),
    ageGroup: v.string(),
    gender: gender,
    status: categoryStatus,
  })
    .index("byClub", ["clubId"])
    .index("byClubAndName", ["clubId", "name"]),

  /**
   * Players - Independent player entities within clubs.
   * userId is optional - only set if player wants to link their account.
   */
  players: defineTable({
    // Core identity
    firstName: v.string(),
    lastName: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    dateOfBirth: v.optional(v.string()),

    // Club relationship
    clubId: v.id("clubs"),
    categoryId: v.id("categories"),

    // Sport-specific data
    sportType: sportType,
    jerseyNumber: v.optional(v.number()),
    position: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    highlights: v.optional(v.array(playerHighlightValidator)),
    bioTitle: v.optional(v.string()),
    bioContent: v.optional(v.string()),
    country: v.optional(v.string()),

    // Status
    status: playerStatus,

    // Optional link to user account (if player wants to login)
    userId: v.optional(v.id("users")),
  })
    .index("byClub", ["clubId"])
    .index("byCategory", ["categoryId"])
    .index("byClubAndCategory", ["clubId", "categoryId"])
    .index("byUser", ["userId"]),

  /**
   * Staff - Links users to clubs as staff members (coaches, etc.).
   * A user can have multiple staff roles across different clubs.
   */
  staff: defineTable({
    userId: v.id("users"),
    clubId: v.id("clubs"),
    categoryId: v.optional(v.id("categories")),
    role: staffRole,
  })
    .index("byUser", ["userId"])
    .index("byClub", ["clubId"])
    .index("byCategory", ["categoryId"])
    .index("byClubAndRole", ["clubId", "role"]),

  /**
   * Conferences - Groupings within a league.
   */
  conferences: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    divisions: v.optional(v.array(v.string())),
  })
    .index("byOrganization", ["organizationId"])
    .index("byOrgAndName", ["organizationId", "name"]),

  /**
   * League Settings - Configuration for a league/organization.
   */
  leagueSettings: defineTable({
    organizationId: v.id("organizations"),
    sportType: sportType,
    ageCategories: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        minAge: v.number(),
        maxAge: v.number(),
      }),
    ),
    positions: v.optional(v.array(positionValidator)),
    enabledGenders: v.array(gender),
    seasons: v.optional(v.array(seasonValidator)),
    horizontalDivisions: v.optional(
      v.object({
        enabled: v.boolean(),
        type: v.union(
          v.literal("alphabetic"),
          v.literal("greek"),
          v.literal("numeric"),
        ),
      }),
    ),
  }).index("byOrganization", ["organizationId"]),

  /**
   * Games - Matches between two clubs.
   */
  games: defineTable({
    organizationId: v.id("organizations"),
    seasonId: v.optional(v.string()),
    homeClubId: v.id("clubs"),
    awayClubId: v.id("clubs"),
    date: v.string(),
    startTime: v.string(),
    category: v.string(),
    gender: gender,
    locationName: v.optional(v.string()),
    locationCoordinates: v.optional(v.array(v.number())),
    status: gameStatus,
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    // Stats submission tracking
    homeStatsSubmittedAt: v.optional(v.number()),
    awayStatsSubmittedAt: v.optional(v.number()),
    homeStatsConfirmed: v.optional(v.boolean()),
    awayStatsConfirmed: v.optional(v.boolean()),
  })
    .index("byOrganization", ["organizationId"])
    .index("byOrganizationAndSeason", ["organizationId", "seasonId"])
    .index("byHomeClub", ["homeClubId"])
    .index("byAwayClub", ["awayClubId"])
    .index("byDate", ["date"])
    .index("byStatus", ["status"]),

  /**
   * Game Player Stats - Individual player statistics for a game.
   */
  gamePlayerStats: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    clubId: v.id("clubs"),
    isStarter: v.boolean(),
    minutes: v.optional(v.number()),
    points: v.optional(v.number()),
    fieldGoalsMade: v.optional(v.number()),
    fieldGoalsAttempted: v.optional(v.number()),
    threePointersMade: v.optional(v.number()),
    threePointersAttempted: v.optional(v.number()),
    freeThrowsMade: v.optional(v.number()),
    freeThrowsAttempted: v.optional(v.number()),
    offensiveRebounds: v.optional(v.number()),
    defensiveRebounds: v.optional(v.number()),
    assists: v.optional(v.number()),
    steals: v.optional(v.number()),
    blocks: v.optional(v.number()),
    turnovers: v.optional(v.number()),
    personalFouls: v.optional(v.number()),
    plusMinus: v.optional(v.number()),
  })
    .index("byGame", ["gameId"])
    .index("byPlayer", ["playerId"])
    .index("byGameAndClub", ["gameId", "clubId"]),
});
