#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";

const require = createRequire(import.meta.url);
const DEFAULT_DIRECT_SITE_ORIGIN = "https://www.nisaaleague.com";
const DEFAULT_DIRECT_BROWSER_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

const CANONICAL_POSITION_DEFINITIONS = {
  G: {
    id: "guard",
    name: "Guard",
    abbreviation: "G",
    aliases: ["g", "guard"],
  },
  F: {
    id: "forward",
    name: "Forward",
    abbreviation: "F",
    aliases: ["f", "fw", "forward"],
  },
  C: {
    id: "center",
    name: "Center",
    abbreviation: "C",
    aliases: ["c", "center"],
  },
  "G/F": {
    id: "guard-forward",
    name: "Guard / Forward",
    abbreviation: "G/F",
    aliases: ["g/f", "gf", "guard/forward", "guardforward"],
  },
  "F/C": {
    id: "forward-center",
    name: "Forward / Center",
    abbreviation: "F/C",
    aliases: ["f/c", "fc", "forward/center", "forwardcenter"],
  },
};

function hasFlag(args, name) {
  return args.includes(name);
}

function getArg(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

function getArgs(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(args[index + 1]);
    }
  }
  return values;
}

async function loadEnvFile(filePath) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function printUsage() {
  console.log(`Usage:
  node scripts/import-pdf-rosters.mjs --org <slug> --age-group <value> [options]

Required for upload:
  --org <slug>                Organization slug in Convex
  --age-group <value>         Category ageGroup to assign to imported players

Optional:
  --mode <server|direct>      Import mode (default: server)
  --category-name <value>     Category name to create/reuse (defaults to age-group)
  --gender <female|male|mixed> Defaults to female
  --dir <path>                PDF directory (default: public/data)
  --only <text>               Filter PDFs by filename, repeatable
  --dry-run                   Evaluate import without writing
  --parse-only                Only parse PDFs locally and print summary
  --preview-file <path>       Write parsed payload JSON to disk
  --convex-url <url>          Override NEXT_PUBLIC_CONVEX_URL
  --secret <value>            Override ROSTER_IMPORT_SECRET / LEGACY_MIGRATION_SECRET
  --site-url <url>            Public site URL used for Clerk browser auth in direct mode
  --admin-email <email>       Prefer this admin/superadmin for direct mode
  --browser-path <path>       Override browser executable for direct mode
`);
}

function runParser({ cwd, directory, only }) {
  const parserScript = path.join(cwd, "scripts", "parse_pdf_rosters.py");
  const parserArgs = [parserScript, "--dir", directory];
  for (const filter of only) {
    parserArgs.push("--only", filter);
  }

  const result = spawnSync("python3", parserArgs, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || result.stdout?.trim() || "PDF parser failed",
    );
  }

  return JSON.parse(result.stdout);
}

function printParsedSummary(parsed) {
  console.log(`[parse] teams=${parsed.teams.length}`);
  for (const team of parsed.teams) {
    console.log(
      `- ${team.teamName} (${team.slug}) players=${team.players.length} source=${team.sourceFile}`,
    );
  }
}

function printImportSummary(result) {
  if (result.positions) {
    console.log(
      `[positions] created=${result.positions.created} reused=${result.positions.reused}`,
    );
  }

  console.log(
    `[import] dryRun=${result.dryRun} clubs(created=${result.totals.clubsCreated}, updated=${result.totals.clubsUpdated}, reused=${result.totals.clubsReused}) categories(created=${result.totals.categoriesCreated}, updated=${result.totals.categoriesUpdated}, reused=${result.totals.categoriesReused}) players(created=${result.totals.playersCreated}, updated=${result.totals.playersUpdated}, skipped=${result.totals.playersSkipped})`,
  );

  for (const team of result.teams) {
    console.log(
      `- ${team.teamName} slug=${team.finalSlug} club=${team.clubAction} category=${team.categoryAction} players(created=${team.playersCreated}, updated=${team.playersUpdated}, skipped=${team.playersSkipped})`,
    );
    for (const warning of team.warnings) {
      console.log(`  warning: ${warning}`);
    }
  }
}

function normalizeSpaces(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeSpaces(value).toLowerCase();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nicknameify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizePlayerName(value) {
  return normalizeSpaces(value).toLowerCase();
}

function buildPlayerKey(fullName, jerseyNumber) {
  return `${normalizePlayerName(fullName)}::${jerseyNumber ?? ""}`;
}

function splitPlayerName(fullName) {
  const normalized = normalizeSpaces(fullName);
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length <= 1) {
    return {
      firstName: normalized || "Unknown",
      lastName: "Unknown",
      warning: `Single-part player name "${fullName}" was padded with temporary last name`,
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
    warning: null,
  };
}

function normalizeSiteUrl(siteUrl) {
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}

function getSignInUrl(siteUrl) {
  return `${normalizeSiteUrl(siteUrl)}/sign-in`;
}

function buildPositionDefinition(rawPosition) {
  const normalized = normalizeSpaces(rawPosition).toUpperCase();
  const predefined = CANONICAL_POSITION_DEFINITIONS[normalized];
  if (predefined) {
    return predefined;
  }

  const abbreviation = normalized;
  return {
    id: `import-${slugify(abbreviation) || crypto.randomUUID()}`,
    name: abbreviation.replaceAll("/", " / "),
    abbreviation,
    aliases: [normalizeKey(abbreviation)],
  };
}

function getPositionSearchTerms(rawPosition) {
  const definition = buildPositionDefinition(rawPosition);
  return new Set(
    [
      definition.id,
      definition.name,
      definition.abbreviation,
      ...definition.aliases,
    ]
      .filter(Boolean)
      .map((value) => normalizeKey(String(value))),
  );
}

function findMatchingPosition(existingPositions, rawPosition) {
  const searchTerms = getPositionSearchTerms(rawPosition);
  return (
    existingPositions.find((position) => {
      const candidates = [
        position.id,
        position.name,
        position.abbreviation,
        `${position.name}/${position.abbreviation}`,
      ].map((value) => normalizeKey(String(value)));
      return candidates.some((candidate) => searchTerms.has(candidate));
    }) ?? null
  );
}

function needsPlayerUpdate(existingPlayer, nextPlayer) {
  const comparableFields = [
    "firstName",
    "lastName",
    "categoryId",
    "jerseyNumber",
    "position",
  ];

  return comparableFields.some(
    (field) => existingPlayer[field] !== nextPlayer[field],
  );
}

function buildDirectImportResult(dryRun) {
  return {
    dryRun,
    positions: {
      created: 0,
      reused: 0,
    },
    totals: {
      clubsCreated: 0,
      clubsUpdated: 0,
      clubsReused: 0,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      categoriesReused: 0,
      playersCreated: 0,
      playersUpdated: 0,
      playersSkipped: 0,
    },
    teams: [],
  };
}

async function loadPlaywrightCore() {
  const candidates = [
    "playwright-core",
    process.env.PLAYWRIGHT_CORE_PATH,
    "/tmp/nisaa-import-runner/node_modules/playwright-core",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }

  throw new Error(
    'Direct mode requires "playwright-core". Install it with `npm install --no-save playwright-core` or set PLAYWRIGHT_CORE_PATH.',
  );
}

async function resolveBrowserPath(browserPath) {
  if (browserPath) {
    return browserPath;
  }

  for (const candidate of DEFAULT_DIRECT_BROWSER_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  throw new Error(
    "Unable to find a supported browser executable. Pass --browser-path explicitly.",
  );
}

async function selectAdminUser(clerk, adminEmail) {
  if (adminEmail) {
    const response = await clerk.users.getUserList({
      emailAddress: [adminEmail],
    });
    const user = response.data[0] ?? null;
    if (!user) {
      throw new Error(`Admin user "${adminEmail}" was not found in Clerk`);
    }
    return user;
  }

  const response = await clerk.users.getUserList({ limit: 100 });
  const user =
    response.data.find(
      (candidate) => candidate.publicMetadata?.isSuperAdmin === true,
    ) ??
    response.data.find(
      (candidate) =>
        candidate.publicMetadata?.role === "admin" ||
        candidate.publicMetadata?.role === "superadmin",
    ) ??
    null;

  if (!user) {
    throw new Error("No admin or superadmin user was found in Clerk");
  }

  return user;
}

async function getDirectConvexToken({ adminEmail, browserPath, siteUrl }) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for direct mode");
  }

  const { chromium } = await loadPlaywrightCore();
  const executablePath = await resolveBrowserPath(browserPath);
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const adminUser = await selectAdminUser(clerk, adminEmail);
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId: adminUser.id,
    expiresInSeconds: 600,
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(getSignInUrl(siteUrl), {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForFunction(
      () => Boolean(window.Clerk && window.Clerk.loaded),
      {
        timeout: 60_000,
      },
    );

    const signInResult = await page.evaluate(async (ticket) => {
      const clerk = window.Clerk;
      if (!clerk?.client?.signIn) {
        return { ok: false, reason: "missing_sign_in_resource" };
      }

      const signIn = await clerk.client.signIn.create({
        strategy: "ticket",
        ticket,
      });

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        return { ok: false, reason: signIn.status ?? "unknown" };
      }

      await clerk.setActive({
        session: signIn.createdSessionId,
      });

      return { ok: true };
    }, signInToken.token);

    if (!signInResult?.ok) {
      throw new Error(
        `Failed to create Clerk session in direct mode (${signInResult?.reason ?? "unknown"})`,
      );
    }

    await page.goto(siteUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const token = await page.evaluate(async () => {
      if (!window.Clerk?.session) {
        return null;
      }
      return await window.Clerk.session.getToken({ template: "convex" });
    });

    if (!token) {
      throw new Error("Failed to obtain Convex auth token from Clerk session");
    }

    return {
      token,
      adminEmail:
        adminUser.emailAddresses.find(
          (emailAddress) => emailAddress.id === adminUser.primaryEmailAddressId,
        )?.emailAddress ??
        adminEmail ??
        adminUser.id,
    };
  } finally {
    await browser.close().catch(() => {});
    await clerk.signInTokens.revokeSignInToken(signInToken.id).catch(() => {});
  }
}

async function ensureOrganization(convex, api, orgSlug) {
  const organization = await convex.query(api.organizations.getBySlug, {
    slug: orgSlug,
  });
  if (!organization) {
    throw new Error(`Organization "${orgSlug}" was not found in Convex`);
  }
  return organization;
}

async function ensureLeaguePositions({
  convex,
  api,
  orgSlug,
  parsed,
  dryRun,
  result,
}) {
  const uniqueRawPositions = [
    ...new Set(
      parsed.teams.flatMap((team) =>
        team.players
          .map((player) => player.rawPosition)
          .filter(
            (position) => typeof position === "string" && position.length > 0,
          ),
      ),
    ),
  ].sort();

  const positionIdByRaw = new Map();
  let teamConfig = await convex.query(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  let existingPositions = teamConfig?.positions ?? [];

  for (const rawPosition of uniqueRawPositions) {
    let matchingPosition = findMatchingPosition(existingPositions, rawPosition);
    if (matchingPosition) {
      positionIdByRaw.set(rawPosition, matchingPosition.id);
      result.positions.reused += 1;
      continue;
    }

    const definition = buildPositionDefinition(rawPosition);

    if (dryRun) {
      positionIdByRaw.set(rawPosition, definition.id);
      result.positions.created += 1;
      existingPositions = [
        ...existingPositions,
        {
          id: definition.id,
          name: definition.name,
          abbreviation: definition.abbreviation,
        },
      ];
      continue;
    }

    await convex.mutation(api.leagueSettings.addPosition, {
      leagueSlug: orgSlug,
      position: {
        id: definition.id,
        name: definition.name,
        abbreviation: definition.abbreviation,
      },
    });

    teamConfig = await convex.query(api.leagueSettings.getTeamConfig, {
      leagueSlug: orgSlug,
    });
    existingPositions = teamConfig?.positions ?? [];
    matchingPosition = findMatchingPosition(existingPositions, rawPosition);

    if (!matchingPosition) {
      throw new Error(
        `Position "${rawPosition}" could not be verified after creation`,
      );
    }

    positionIdByRaw.set(rawPosition, matchingPosition.id);
    result.positions.created += 1;
  }

  return positionIdByRaw;
}

async function ensureClub({
  convex,
  api,
  orgSlug,
  organizationId,
  teamName,
  slug,
  dryRun,
}) {
  const desiredNickname = nicknameify(teamName);
  if (!desiredNickname) {
    throw new Error(`Unable to derive nickname from "${teamName}"`);
  }

  const bySourceSlug = await convex.query(api.clubs.getBySlug, { slug });
  const byDesiredSlug =
    slug !== desiredNickname
      ? await convex.query(api.clubs.getBySlug, { slug: desiredNickname })
      : bySourceSlug;
  const existingClub = bySourceSlug ?? byDesiredSlug;

  if (existingClub) {
    if (String(existingClub.organizationId) !== String(organizationId)) {
      throw new Error(
        `Club slug "${slug}" already exists outside organization "${orgSlug}"`,
      );
    }

    const needsUpdate =
      normalizeSpaces(existingClub.name) !== normalizeSpaces(teamName) ||
      (existingClub.nickname ?? "") !== desiredNickname ||
      existingClub.slug !== desiredNickname;

    if (needsUpdate && !dryRun) {
      await convex.mutation(api.clubs.update, {
        clubId: existingClub._id,
        name: teamName,
        nickname: desiredNickname,
      });
    }

    return {
      clubSlug: needsUpdate && dryRun ? existingClub.slug : desiredNickname,
      finalSlug: desiredNickname,
      action: needsUpdate ? "updated" : "reused",
    };
  }

  if (!dryRun) {
    await convex.mutation(api.clubs.createWithDelegate, {
      name: teamName,
      nickname: desiredNickname,
      orgSlug,
      status: "affiliated",
    });
  }

  return {
    clubSlug: desiredNickname,
    finalSlug: desiredNickname,
    action: "created",
  };
}

async function ensureCategory({
  convex,
  api,
  clubSlug,
  categoryName,
  ageGroup,
  gender,
  dryRun,
}) {
  const categories = await convex.query(api.categories.listByClubSlug, {
    clubSlug,
  });
  const matchingCategory =
    categories.find(
      (category) =>
        normalizeKey(category.name) === normalizeKey(categoryName) &&
        normalizeKey(category.ageGroup) === normalizeKey(ageGroup) &&
        category.gender === gender,
    ) ?? null;

  if (matchingCategory) {
    return {
      categoryId: matchingCategory._id,
      action: "reused",
    };
  }

  if (!dryRun) {
    await convex.mutation(api.categories.create, {
      clubSlug,
      name: categoryName,
      ageGroup,
      gender,
    });
  }

  const refreshedCategories = dryRun
    ? [
        ...categories,
        {
          _id: `dry-run-${clubSlug}-${slugify(categoryName)}`,
          name: categoryName,
          ageGroup,
          gender,
        },
      ]
    : await convex.query(api.categories.listByClubSlug, {
        clubSlug,
      });

  const createdCategory =
    refreshedCategories.find(
      (category) =>
        normalizeKey(category.name) === normalizeKey(categoryName) &&
        normalizeKey(category.ageGroup) === normalizeKey(ageGroup) &&
        category.gender === gender,
    ) ?? null;

  if (!createdCategory) {
    throw new Error(
      `Category "${categoryName}" for club "${clubSlug}" could not be verified`,
    );
  }

  return {
    categoryId: createdCategory._id,
    action: "created",
  };
}

function buildPlayerIndexes(players) {
  const byNameAndJersey = new Map();
  const byName = new Map();

  for (const player of players) {
    const fullName = `${player.firstName} ${player.lastName}`.trim();
    const key = buildPlayerKey(fullName, player.jerseyNumber ?? undefined);
    byNameAndJersey.set(key, player);

    const normalizedName = normalizePlayerName(fullName);
    const current = byName.get(normalizedName) ?? [];
    current.push(player);
    byName.set(normalizedName, current);
  }

  return { byNameAndJersey, byName };
}

async function importDirect({
  convex,
  api,
  parsed,
  orgSlug,
  categoryName,
  ageGroup,
  gender,
  dryRun,
}) {
  const result = buildDirectImportResult(dryRun);
  const organization = await ensureOrganization(convex, api, orgSlug);
  const positionIdByRaw = await ensureLeaguePositions({
    convex,
    api,
    orgSlug,
    parsed,
    dryRun,
    result,
  });

  for (const team of parsed.teams) {
    const warnings = [];
    const ensuredClub = await ensureClub({
      convex,
      api,
      orgSlug,
      organizationId: organization._id,
      teamName: team.teamName,
      slug: team.slug,
      dryRun,
    });

    if (ensuredClub.action === "created") {
      result.totals.clubsCreated += 1;
    } else if (ensuredClub.action === "updated") {
      result.totals.clubsUpdated += 1;
    } else {
      result.totals.clubsReused += 1;
    }

    if (dryRun && ensuredClub.action === "created") {
      const warnings = team.players
        .map((player) => splitPlayerName(player.fullName).warning)
        .filter(Boolean);
      const playersCreated = team.players.length;

      result.totals.categoriesCreated += 1;
      result.totals.playersCreated += playersCreated;
      result.teams.push({
        teamName: team.teamName,
        finalSlug: ensuredClub.finalSlug,
        clubAction: ensuredClub.action,
        categoryAction: "created",
        playersCreated,
        playersUpdated: 0,
        playersSkipped: 0,
        warnings,
      });
      continue;
    }

    const ensuredCategory = await ensureCategory({
      convex,
      api,
      clubSlug: ensuredClub.clubSlug,
      categoryName,
      ageGroup,
      gender,
      dryRun,
    });

    if (ensuredCategory.action === "created") {
      result.totals.categoriesCreated += 1;
    } else {
      result.totals.categoriesReused += 1;
    }

    const existingPlayers = await convex.query(
      api.players.listBasketballPlayersByClubSlug,
      {
        clubSlug: ensuredClub.clubSlug,
      },
    );
    const indexes = buildPlayerIndexes(existingPlayers);
    let teamPlayersCreated = 0;
    let teamPlayersUpdated = 0;
    let teamPlayersSkipped = 0;

    for (const player of team.players) {
      const nameParts = splitPlayerName(player.fullName);
      if (nameParts.warning) {
        warnings.push(nameParts.warning);
      }

      const nextPlayer = {
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        categoryId: ensuredCategory.categoryId,
        jerseyNumber: player.jerseyNumber ?? undefined,
        position: player.rawPosition
          ? (positionIdByRaw.get(player.rawPosition) ?? undefined)
          : undefined,
      };

      const exactMatch =
        indexes.byNameAndJersey.get(
          buildPlayerKey(player.fullName, player.jerseyNumber ?? undefined),
        ) ?? null;
      const nameMatches =
        indexes.byName.get(normalizePlayerName(player.fullName)) ?? [];
      const matchedPlayer =
        exactMatch ?? (nameMatches.length === 1 ? nameMatches[0] : null);

      if (matchedPlayer && exactMatch === null && nameMatches.length > 1) {
        warnings.push(
          `Ambiguous existing player match for "${player.fullName}" in ${team.teamName}; skipped duplicate-safe update`,
        );
        teamPlayersSkipped += 1;
        result.totals.playersSkipped += 1;
        continue;
      }

      if (!matchedPlayer) {
        if (!dryRun) {
          await convex.mutation(api.players.createPlayer, {
            ...nextPlayer,
            sportType: "basketball",
          });
        }

        const createdPlayer = {
          _id: `dry-run-${ensuredClub.clubSlug}-${slugify(player.fullName)}-${player.jerseyNumber ?? "na"}`,
          ...nextPlayer,
        };
        indexes.byNameAndJersey.set(
          buildPlayerKey(player.fullName, player.jerseyNumber ?? undefined),
          createdPlayer,
        );
        const normalizedName = normalizePlayerName(player.fullName);
        indexes.byName.set(normalizedName, [
          ...(indexes.byName.get(normalizedName) ?? []),
          createdPlayer,
        ]);

        teamPlayersCreated += 1;
        result.totals.playersCreated += 1;
        continue;
      }

      if (!needsPlayerUpdate(matchedPlayer, nextPlayer)) {
        teamPlayersSkipped += 1;
        result.totals.playersSkipped += 1;
        continue;
      }

      if (!dryRun) {
        await convex.mutation(api.players.updatePlayer, {
          playerId: matchedPlayer._id,
          ...nextPlayer,
        });
      }

      Object.assign(matchedPlayer, nextPlayer);
      teamPlayersUpdated += 1;
      result.totals.playersUpdated += 1;
    }

    result.teams.push({
      teamName: team.teamName,
      finalSlug: ensuredClub.finalSlug,
      clubAction: ensuredClub.action,
      categoryAction: ensuredCategory.action,
      playersCreated: teamPlayersCreated,
      playersUpdated: teamPlayersUpdated,
      playersSkipped: teamPlayersSkipped,
      warnings,
    });
  }

  return result;
}

async function importViaServerMutation({
  convex,
  api,
  parsed,
  orgSlug,
  dryRun,
  categoryName,
  ageGroup,
  gender,
  secret,
}) {
  return await convex.mutation(api.rosterImports.importPdfRosters, {
    secret,
    orgSlug,
    dryRun,
    defaults: {
      categoryName,
      ageGroup,
      gender,
      clubStatus: "affiliated",
    },
    teams: parsed.teams,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) {
    printUsage();
    process.exit(0);
  }

  const cwd = process.cwd();
  await loadEnvFile(path.join(cwd, ".env.prod"));
  await loadEnvFile(path.join(cwd, ".env.local"));
  await loadEnvFile(path.join(cwd, ".env"));

  const orgSlug = getArg(args, "--org", "");
  const ageGroup = getArg(args, "--age-group", "");
  const categoryName = getArg(args, "--category-name", ageGroup);
  const gender = getArg(args, "--gender", "female");
  const mode = getArg(args, "--mode", "server");
  const directory = getArg(args, "--dir", "public/data");
  const previewFile = getArg(args, "--preview-file");
  const siteUrl =
    getArg(args, "--site-url") ??
    `${DEFAULT_DIRECT_SITE_ORIGIN}/${orgSlug || process.env.DEFAULT_TENANT_SLUG || "nisaa"}`;
  const adminEmail = getArg(args, "--admin-email");
  const browserPath = getArg(args, "--browser-path");
  const only = getArgs(args, "--only");
  const parseOnly = hasFlag(args, "--parse-only");
  const dryRun = hasFlag(args, "--dry-run");

  const parsed = runParser({ cwd, directory, only });

  if (previewFile) {
    await fs.writeFile(previewFile, JSON.stringify(parsed, null, 2));
    console.log(`[preview] wrote ${previewFile}`);
  }

  printParsedSummary(parsed);

  if (parseOnly) {
    return;
  }

  if (!orgSlug || !ageGroup) {
    throw new Error(
      "--org and --age-group are required unless --parse-only is used",
    );
  }

  const convexUrl =
    getArg(args, "--convex-url") ?? process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is missing");
  }

  const convex = new ConvexHttpClient(convexUrl);
  const { api } = await import("../convex/_generated/api.js");
  let result;

  if (mode === "server") {
    const secret =
      getArg(args, "--secret") ??
      process.env.ROSTER_IMPORT_SECRET ??
      process.env.LEGACY_MIGRATION_SECRET;
    if (!secret) {
      throw new Error(
        "ROSTER_IMPORT_SECRET or LEGACY_MIGRATION_SECRET is missing for server mode",
      );
    }

    result = await importViaServerMutation({
      convex,
      api,
      parsed,
      orgSlug,
      dryRun,
      categoryName,
      ageGroup,
      gender,
      secret,
    });
  } else if (mode === "direct") {
    const auth = await getDirectConvexToken({
      adminEmail,
      browserPath,
      siteUrl,
    });
    console.log(`[auth] mode=direct admin=${auth.adminEmail}`);
    convex.setAuth(auth.token);
    result = await importDirect({
      convex,
      api,
      parsed,
      orgSlug,
      categoryName,
      ageGroup,
      gender,
      dryRun,
    });
  } else {
    throw new Error(`Unsupported mode "${mode}"`);
  }

  printImportSummary(result);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
