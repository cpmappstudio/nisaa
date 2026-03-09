---
applyTo: "**/*"
---

# Multi-Sport Refactor Plan

## Goal

Evolve the app from a basketball-first implementation into a multi-sport architecture that can support basketball and soccer in the same codebase without duplicating shared platform logic.

## Non-Goals

- Do not generalize sport-specific stats too early.
- Do not introduce abstractions that are only used once.
- Do not split the project into separate repositories at this stage.
- Do not rewrite working basketball features unless needed to create a stable boundary for future soccer support.

## Shared Principles

1. Keep one source of truth for the tenant sport type.
2. Separate shared platform concerns from sport-specific domain concerns.
3. Prefer explicit sport modules over conditional logic spread across pages and components.
4. Preserve current basketball behavior while creating extension points for soccer.
5. Avoid speculative abstractions until the same pattern exists in both sports.

## Phases

### Phase 1: Canonical sport resolution

Objective:
Resolve the tenant sport type from backend data and remove hardcoded basketball assumptions from server layouts and top-level pages.

Tasks:
- Add a dedicated backend query to resolve `sportType` by tenant/league slug.
- Add a server-only helper that fetches the tenant sport type.
- Update org/team layouts to pass the resolved sport type into `SportProvider`.
- Update top-level sport-aware pages that currently hardcode basketball.
- Keep basketball as the default only when league settings do not exist yet.

Exit criteria:
- No layout should hardcode `"basketball"` as the sport type.
- Top-level sport-aware pages should read the sport type from the same canonical helper.

### Phase 2: Create a real sport module registry

Objective:
Turn the current terminology/config registry into a real module contract that can resolve sport-specific implementations.

Tasks:
- Define a `SportModule` interface.
- Move basketball entrypoints behind the module contract.
- Keep shared shell pages generic and delegate sport-specific rendering through the registry.

Exit criteria:
- Pages stop importing basketball implementations directly when the rendering should depend on tenant sport type.

### Phase 3: Separate shared UI from basketball UI

Objective:
Create clear boundaries between reusable platform UI and basketball-specific feature UI.

Tasks:
- Move basketball-specific team/player/game views under a dedicated sport module area.
- Keep shared data tables, layout primitives, dialogs, navigation helpers, and auth flows in shared folders.
- Remove cross-imports where shared components depend on basketball-specific code.

Exit criteria:
- Basketball-specific code is grouped by sport and not mixed into shared shell code without a clear boundary.

### Phase 4: Normalize backend domain boundaries

Objective:
Keep shared entities shared, and move sport-specific stats/data pipelines into separate backend modules.

Tasks:
- Keep organizations, memberships, clubs, staff, categories, league shell settings, player identity, and game scheduling shared.
- Design separate sport-specific stats storage instead of one catch-all stats table.
- Keep shared game metadata in `games`.
- Introduce sport-specific stats tables and aggregation functions in later steps.

Exit criteria:
- Sport-specific metrics are not modeled through a single oversized optional-field structure.

### Phase 5: Introduce soccer verticals incrementally

Objective:
Add soccer feature slices only after the architecture can resolve sport modules cleanly.

Tasks:
- Add soccer module entrypoints for teams, roster, player detail, and basic game detail.
- Add soccer-specific forms and stats flows after module boundaries are stable.
- Reuse shared shell/layout/navigation infrastructure.

Exit criteria:
- Soccer can be introduced without branching platform logic across unrelated files.

## Recommended Order Of Work

1. Finish Phase 1 completely before touching stats.
2. Implement the sport module registry before adding soccer components.
3. Move basketball code into explicit sport modules before modeling soccer stats.
4. Add soccer verticals only after shared vs sport-specific boundaries are stable.

## Warning Signs

- A shared component starts accepting many sport-specific boolean props.
- A Convex table gains many optional fields that only belong to one sport.
- A page imports both shared shell code and basketball-specific code directly when the tenant sport type should decide the implementation.
- New abstractions are added without at least two concrete consumers.

## Current Branch Progress

Completed on `refactor/soccer-architecture-study`:

- Phase 1 completed:
  - canonical `sportType` resolution by tenant from Convex
  - org/team layouts now hydrate `SportProvider` from backend sport type
- Phase 2 largely completed for current page entrypoints:
  - sport module registry introduced
  - teams, roster, player detail, team detail, team settings, game detail, and stats now resolve through the sport module
  - soccer module currently returns an explicit not-implemented placeholder
- Phase 3 started:
  - player detail moved under a basketball-specific component path
  - game detail and season stats views moved under basketball-specific component paths
  - shared shell wrappers no longer import basketball implementations directly from `app/` entrypoints
  - `components/sections/shell/teams`, `players`, and `games` now use explicit `shared/` folders for shared implementations
  - basketball-only files now stay under `basketball/`, soccer-only files under `soccer/`
  - redundant basketball wrappers that only re-exported shared components have been removed to reduce folder noise
  - shared shell consumers now import directly from `shared/` instead of ambiguous root paths
- Phase 4 started:
  - league sport type can be configured from settings with safe locking rules
  - player list queries are now shared and filter by the league sport type
  - player creation/update flows now enforce league sport compatibility in Convex
  - basketball game/stats flows now enforce league sport compatibility in Convex
  - direct access to `gamePlayerStats` is now encapsulated behind basketball-specific helpers
  - basketball stats now live only in `basketballGamePlayerStats`
  - the legacy shared `gamePlayerStats` table has been removed from the code path and schema
  - league settings now provide default position definitions per sport, and sport changes reset positions to the defaults of the selected sport
- Phase 5 started:
  - the soccer module now renders shared teams, team detail, team settings, league roster, and team roster pages
  - the soccer module now renders shared player detail and shared game detail views based on sport-agnostic identity/metadata
  - soccer-specific placeholders remain only for stats flows that still depend on basketball-only aggregation logic
  - soccer now has a dedicated player profile extension path for registration fields such as Comet number, FIFA ID, dominant profile, and expanded personal identity fields

Next recommended cuts:

1. Confirm whether the requested soccer stats are team-per-game stats as documented in `soccer-stats-v1-proposal.instructions.md`.
2. Implement the soccer team stats schema and aggregation pipeline instead of stretching the basketball box score model.
3. Introduce soccer-specific player/game enhancements only when a second concrete consumer justifies them.
4. Keep new domain work inside `shared/`, `basketball/`, or `soccer/` only; do not reintroduce ambiguous root-level feature files.
