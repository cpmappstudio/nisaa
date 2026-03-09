---
applyTo: "**/*"
---

# Sports Organization Hardening Plan

## Goal

Leave the codebase in a structure where:

1. shared code is genuinely shared
2. basketball code lives under `basketball/`
3. soccer code lives under `soccer/`
4. adding a third sport does not require editing unrelated shared feature files

## Structural Rules

1. `shared/` must not import concrete sport implementations.
2. Sport-specific branching must happen in:
   - sport modules under `lib/sports/modules/*`
   - sport-specific wrappers under `components/.../basketball/*` or `components/.../soccer/*`
3. Shared feature components may accept injected components, render functions, or typed config, but must not switch on `"basketball"` / `"soccer"` directly.
4. When a feature differs only in a small part, prefer:
   - shared view + sport wrapper
   over
   - duplicated full implementations
5. Convex should follow the same boundary as the frontend:
   - shared domain files
   - basketball-specific files
   - soccer-specific files
6. The league defines the sport. Client forms must not send `sportType` for shared flows when Convex can derive it from the selected league/category.

## Current Domain Decisions

1. Shared player identity lives in `players`:
   - names
   - document number
   - gender
   - nationality/country
   - date of birth
   - photo
   - height
   - weight
2. Sport-specific registration/profile fields live in sport profile tables:
   - `soccerPlayerProfiles` currently owns `cometNumber`, `fifaId`, `dominantProfile`
3. Game creation and game metadata remain shared for now:
   - teams
   - date/time
   - category
   - gender
   - location
   - status
4. What differs by sport is the stats model, stats submission, leaders, and season tables.

## Target Frontend Shape

### Shell features

- `components/sections/shell/teams/shared/*`
- `components/sections/shell/teams/basketball/*`
- `components/sections/shell/teams/soccer/*`

- `components/sections/shell/players/shared/*`
- `components/sections/shell/players/basketball/*`
- `components/sections/shell/players/soccer/*`

- `components/sections/shell/games/shared/*`
- `components/sections/shell/games/basketball/*`
- `components/sections/shell/games/soccer/*`

### Team scope features

- `components/sections/team/shared/*`
- `components/sections/team/basketball/*`
- `components/sections/team/soccer/*`

## Target Backend Shape

### Shared Convex domain

- `convex/clubs.ts`
- `convex/categories.ts`
- `convex/staff.ts`
- `convex/leagueSettings.ts`
- `convex/users.ts`
- `convex/members.ts`
- `convex/organizations.ts`

### Sport-specific Convex domain

- `convex/basketball/*`
- `convex/soccer/*`

If compatibility wrappers are temporarily needed, they must be thin and explicitly marked transitional.

## Ordered Refactor Steps

### Step 1: Remove sport branching from shared UI

Tasks:
- Replace shared `if sportType === ...` switches with injected components.
- Introduce sport-specific wrappers for team settings, roster, and player edit flows.
- Keep shared tables and layouts unaware of concrete sports.

Exit criteria:
- No component under `components/sections/**/shared/*` imports both basketball and soccer components.

### Step 2: Reduce module duplication safely

Tasks:
- Extract common preload/render helpers used by multiple sport modules.
- Keep only truly sport-specific rendering inside `lib/sports/modules/basketball.tsx` and `soccer.tsx`.

Exit criteria:
- Shared pages such as teams, team detail, team settings, league roster, and shared game detail do not duplicate the same preload/render orchestration across sport modules.

### Step 3: Mirror the same boundary in Convex

Tasks:
- Move basketball-only queries/mutations out of shared files such as `players.ts` and `games.ts`.
- Keep shared player identity and shared game metadata in shared files.
- Move soccer-specific flows into sport-specific Convex files.

Exit criteria:
- Shared Convex files do not accumulate sport-specific aggregation logic for multiple sports.

### Step 4: Normalize shared player identity vs sport profile data

Tasks:
- Define exactly which `players` fields are universal identity fields.
- Keep sport registration/profile fields in sport-specific profile tables where needed.
- Avoid growing `players` into a catch-all table.

Exit criteria:
- Adding a new sport does not require stuffing several new optional sport-only fields into `players` by default.

### Step 5: Add a third-sport test mentally before merging major structure changes

Check:
- If we added `volleyball` tomorrow, would we need to edit:
  - shared teams table
  - shared player detail
  - shared dialogs
  - shared Convex files

If the answer is "yes" in many places, the boundary is still wrong.

## Warning Signs

- shared files import concrete sport components
- modules duplicate near-identical preload logic
- sport-specific fields leak into shared UI props without clear need
- Convex shared files mix multiple sports' aggregation pipelines
- adding a sport requires another `if sportType === ...` inside shared code

## Current Focus

Current recommended implementation order:

1. finish Step 1 first
2. then reduce module duplication
3. then harden Convex boundaries

Do not start a broad backend move before Step 1 is complete, because the frontend boundary still defines the clean target shape.

## Current Status

- Step 1 completed:
  - shared team roster/settings flows no longer import concrete sport dialogs
  - shared player detail no longer imports concrete sport dialogs
  - sport-specific wrappers now inject the proper form component
- Step 2 partially completed:
  - shared preload helpers now cover common teams/team-settings/roster server orchestration
  - shared render helpers now cover the repeated teams/team-detail/team-settings/roster/game-detail server orchestration used by multiple sport modules
  - remaining duplication should only be reduced where the rendering is still genuinely identical
- Step 3 started:
  - shared player list/detail flows now centralize soccer profile hydration through `convex/lib/soccerPlayerProfiles.ts` instead of repeating direct table access
  - basketball player detail/game-log implementation moved out of `convex/players.ts`
  - `convex/players.ts` now keeps the public query surface, while basketball-heavy handlers live in `convex/basketball/players.ts`
  - basketball season stats, game stats submission/review, and game box score handlers moved out of `convex/games.ts`
  - basketball season/game stats validators now live under `convex/basketball/validators.ts`, and `convex/games.ts` only imports them for the public API surface
  - shared game permissions and club-logo loading now live under `convex/lib/*`
  - soccer player editing no longer depends on a late fallback query; the shared player detail query now includes the soccer profile fields needed by the edit dialog
  - shared/player-form types, Convex validators, and schema now use explicit enum domains for soccer `gender` and `dominantProfile` instead of loose strings
- Next recommended focus:
  - keep moving the remaining basketball-only game detail/table helpers out of shared files when they stop serving both scopes
  - decide whether `documentNumber` and `gender` should remain part of shared player identity or move to sport-specific registration profiles before introducing a third sport
  - keep validating every move against the "would volleyball require editing shared?" test
