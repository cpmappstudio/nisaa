---
applyTo: "**/*"
---

# Soccer Stats V1 Proposal

## Why this exists

The multi-sport refactor has reached the point where the next meaningful implementation step is the soccer stats domain. At this stage, the architecture is already separated enough that the remaining work is not a generic refactor problem; it is a product/domain modeling decision.

The current basketball stats flow is intentionally basketball-specific:

- `basketballGamePlayerStats` stores per-player box scores.
- `convex/games.ts` aggregates season leaders and season tables from basketball-only metrics.
- `components/sections/shell/stats/basketball/*` renders basketball-specific columns, labels, and leader cards.

Trying to stretch that model into soccer by adding many optional fields would violate the current refactor goals.

## Confirmed soccer player registration fields

For the soccer tenant (`futbolYa`), the player creation/edit flow should collect:

- photo
- Comet number
- FIFA ID
- document number
- gender
- first surname
- second surname
- given names
- date of birth
- place of birth
- country
- birth department
- birth municipality
- playing position
- dominant profile
- height
- weight

Implementation note:

- generic identity fields should live on `players` when they are not inherently soccer-only
- strictly soccer registration fields should live on a soccer-specific extension table

## Recommendation

The stats list currently provided by product is:

- goals
- corner kicks
- free kicks
- yellow cards
- red cards
- penalties
- substitutions

Those metrics look much more like **team match stats** than player box-score stats.

Because of that, the safer first implementation is:

- `soccerGameTeamStats` for team-per-game summary stats
- optional `soccerGamePlayerStats` later, only if product confirms player-level match stats

Do **not** force those seven metrics into a player-per-game schema unless product explicitly confirms that interpretation.

## Proposed scope

### Shared entities that remain unchanged

- `games`
- `players`
- `clubs`
- `categories`
- `leagueSettings`

### New soccer-specific storage

Create a dedicated table such as `soccerGameTeamStats` with one row per team per game.

Suggested fields:

- `gameId`
- `clubId`
- `goals`
- `cornerKicks`
- `freeKicks`
- `yellowCards`
- `redCards`
- `penalties`
- `substitutions`

This is intentionally small and matches the stats request more closely.

## Explicit non-goals for V1

Do not include these in the first implementation:

- player-event timelines
- passes completed / attempted
- key passes / chances created
- expected goals / expected assists
- duels
- carries / dribbles
- offsides
- fouls drawn / committed
- crosses
- heatmaps
- tracking data

These can be added later only if there is a concrete product need.

## Proposed season aggregates

### Team season table

Do **not** derive team stats from player rows when the requested metrics are team match stats and `games` already stores the score.

Recommended V1 team aggregates:

- team
- matches played
- wins
- draws
- losses
- points
- win pct
- goals for
- goals against
- goal difference
- corner kicks
- free kicks
- yellow cards
- red cards
- penalties
- substitutions

Notes:

- `wins`, `draws`, `losses`, `points`, `goals for`, `goals against`, and `goal difference` should primarily come from `games.homeScore` / `games.awayScore`.
- `corner kicks`, `free kicks`, `yellow cards`, `red cards`, `penalties`, and `substitutions` can be aggregated from `soccerGameTeamStats`.

## Proposed season leaders page

V1 leader cards should stay limited to metrics that are easy to understand and comparable:

### Team leaders

- points per game
- goals for per game
- goals allowed per game
- corner kicks per game
- free kicks per game
- win pct

## Why this model is the right starting point

- It creates a real soccer-specific data boundary instead of stretching the basketball schema.
- It keeps storage summary-based, which matches the current app architecture and avoids event modeling too early.
- It supports a useful first version of team tables and leaders with the metrics actually requested.
- It keeps the refactor DRY because shared shell/UI can be reused, while the stats pipeline remains sport-specific.

## Required implementation sequence

1. Add `soccerGameTeamStats` to Convex schema.
2. Add a dedicated helper module in `convex/lib/soccerGameTeamStats.ts`.
3. Add soccer-only queries in `convex/games.ts` for:
   - season leaders
   - season stats table
4. Add soccer-only stats columns under `components/sections/shell/stats/soccer/*`.
5. Add a soccer `SeasonStatsPage` that mirrors the basketball page structure but uses soccer team metrics.
6. Wire `lib/sports/modules/soccer.tsx` to the new page.

## Decision checkpoint

Before implementing soccer stats, confirm one thing:

- Are the requested soccer stats stored **per team per game**?

If yes, the next implementation cut should be a team-game stats pipeline, not a player-game stats pipeline.
