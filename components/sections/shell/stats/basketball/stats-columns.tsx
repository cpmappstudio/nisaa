"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar } from "@/components/ui/avatar";
import { createSearchColumn } from "@/components/table/column-helpers";
import { Button } from "@/components/ui/button";
import type { FilterConfig } from "@/lib/table/types";
import { cn } from "@/lib/utils";

type Translator = (key: string) => string;

export const COMPACT_STATS_TABLE_CLASS =
  "[&_[data-slot=table]]:text-[11px] [&_[data-slot=table-head]]:h-8 [&_[data-slot=table-head]]:px-1.5 [&_[data-slot=table-head]]:text-[10px] [&_[data-slot=table-head]]:font-semibold [&_[data-slot=table-head]_*]:text-[10px] [&_[data-slot=table-cell]]:px-1.5 [&_[data-slot=table-cell]]:py-1.5 [&_[data-slot=table-cell]]:text-[11px] [&_[data-slot=table-cell]_*]:text-[11px] [&_[data-slot=table]_.lucide]:size-3 [&_[data-slot=table-row]>*:first-child]:sticky [&_[data-slot=table-row]>*:first-child]:left-0 [&_[data-slot=table-row]>*:first-child]:z-10 [&_[data-slot=table-row]>*:first-child]:bg-card [&_[data-slot=table-header]_[data-slot=table-row]>*:first-child]:z-20 [&_[data-slot=table-row]>*:first-child]:shadow-[1px_0_0_0_hsl(var(--border))]";

export interface SeasonPlayerStatsRow {
  playerId: string;
  playerName: string;
  photoUrl?: string;
  clubId: string;
  clubName: string;
  clubNickname?: string;
  gamesPlayed: number;
  starts: number;
  minutes: number;
  minutesPerGame: number;
  points: number;
  pointsPerGame: number;
  rebounds: number;
  reboundsPerGame: number;
  assists: number;
  assistsPerGame: number;
  steals: number;
  stealsPerGame: number;
  blocks: number;
  blocksPerGame: number;
  turnovers: number;
  turnoversPerGame: number;
  personalFouls: number;
  personalFoulsPerGame: number;
  plusMinus: number;
  plusMinusPerGame: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fgPct: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePct: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  ftPct: number;
}

export interface SeasonTeamStatsRow {
  clubId: string;
  clubName: string;
  clubNickname?: string;
  clubLogoUrl?: string;
  gamesPlayed: number;
  statGamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsForPerGame: number;
  pointsAllowedPerGame: number;
  rebounds: number;
  reboundsPerGame: number;
  assists: number;
  assistsPerGame: number;
  steals: number;
  stealsPerGame: number;
  blocks: number;
  blocksPerGame: number;
  turnovers: number;
  turnoversPerGame: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fgPct: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePct: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  ftPct: number;
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function NumericCell({
  value,
  digits = 1,
  suffix = "",
}: {
  value: number;
  digits?: number;
  suffix?: string;
}) {
  return (
    <span className="font-medium tabular-nums">
      {formatNumber(value, digits)}
      {suffix}
    </span>
  );
}

function buildClubFilterOptions(rows: Array<{ clubName: string }>) {
  return [...new Set(rows.map((row) => row.clubName))]
    .sort((a, b) => a.localeCompare(b))
    .map((clubName) => ({ value: clubName, label: clubName }));
}

export function createStatsSortableHeader(label: string) {
  return ({
    column,
  }: {
    column: {
      toggleSorting: (desc?: boolean) => void;
      getIsSorted: () => false | "asc" | "desc";
    };
  }) => {
    const sortDirection = column.getIsSorted();

    return (
      <Button
        variant="ghost"
        className={cn(
          "relative h-full w-full justify-start rounded-none px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-transparent",
          sortDirection && "bg-muted/70 text-foreground",
        )}
        onClick={() => column.toggleSorting(sortDirection === "asc")}
      >
        {label}
        <span
          className={cn(
            "pointer-events-none absolute left-0 right-0 h-0.5 bg-secondary opacity-0",
            sortDirection === "desc" && "top-0 opacity-100",
            sortDirection === "asc" && "bottom-0 opacity-100",
          )}
        />
      </Button>
    );
  };
}

export function createSeasonPlayerStatsColumns(
  t: Translator,
): ColumnDef<SeasonPlayerStatsRow>[] {
  return [
    createSearchColumn<SeasonPlayerStatsRow>([
      "playerName",
      "clubName",
      "clubNickname",
    ]),
    {
      accessorKey: "playerName",
      header: createStatsSortableHeader(t("games.statsTableColumns.player")),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Avatar
            src={row.original.photoUrl}
            initials={row.original.playerName.slice(0, 1).toUpperCase()}
            alt={row.original.playerName}
            className="size-6 bg-muted text-[10px] text-muted-foreground"
          />
          <span className="font-medium">{row.original.playerName}</span>
        </div>
      ),
    },
    {
      accessorKey: "clubName",
      header: createStatsSortableHeader(t("games.statsTableColumns.team")),
      cell: ({ row }) => {
        const shortName = row.original.clubNickname?.trim();
        return (
          <span className="text-muted-foreground">
            {shortName ? shortName.toUpperCase() : row.original.clubName}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "gamesPlayed",
      header: createStatsSortableHeader(t("games.statsTableColumns.gp")),
      cell: ({ row }) => (
        <NumericCell value={row.original.gamesPlayed} digits={0} />
      ),
    },
    {
      accessorKey: "minutesPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.min")),
      cell: ({ row }) => <NumericCell value={row.original.minutesPerGame} />,
    },
    {
      accessorKey: "pointsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.ppg")),
      cell: ({ row }) => <NumericCell value={row.original.pointsPerGame} />,
    },
    {
      accessorKey: "reboundsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.rpg")),
      cell: ({ row }) => <NumericCell value={row.original.reboundsPerGame} />,
    },
    {
      accessorKey: "assistsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.apg")),
      cell: ({ row }) => <NumericCell value={row.original.assistsPerGame} />,
    },
    {
      accessorKey: "stealsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.spg")),
      cell: ({ row }) => <NumericCell value={row.original.stealsPerGame} />,
    },
    {
      accessorKey: "blocksPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.bpg")),
      cell: ({ row }) => <NumericCell value={row.original.blocksPerGame} />,
    },
    {
      accessorKey: "fgPct",
      header: createStatsSortableHeader(t("games.statsTableColumns.fgPct")),
      cell: ({ row }) => <NumericCell value={row.original.fgPct} suffix="%" />,
    },
    {
      accessorKey: "threePct",
      header: createStatsSortableHeader(t("games.statsTableColumns.threePct")),
      cell: ({ row }) => (
        <NumericCell value={row.original.threePct} suffix="%" />
      ),
    },
    {
      accessorKey: "ftPct",
      header: createStatsSortableHeader(t("games.statsTableColumns.ftPct")),
      cell: ({ row }) => <NumericCell value={row.original.ftPct} suffix="%" />,
    },
    {
      accessorKey: "points",
      header: createStatsSortableHeader(
        t("games.statsTableColumns.pointsTotal"),
      ),
      cell: ({ row }) => <NumericCell value={row.original.points} digits={0} />,
    },
    {
      accessorKey: "fieldGoalsMade",
      header: createStatsSortableHeader(t("games.statsTableColumns.fgm")),
      cell: ({ row }) => (
        <NumericCell value={row.original.fieldGoalsMade} digits={0} />
      ),
    },
    {
      accessorKey: "fieldGoalsAttempted",
      header: createStatsSortableHeader(t("games.statsTableColumns.fga")),
      cell: ({ row }) => (
        <NumericCell value={row.original.fieldGoalsAttempted} digits={0} />
      ),
    },
    {
      accessorKey: "threePointersMade",
      header: createStatsSortableHeader(t("games.statsTableColumns.threePm")),
      cell: ({ row }) => (
        <NumericCell value={row.original.threePointersMade} digits={0} />
      ),
    },
    {
      accessorKey: "threePointersAttempted",
      header: createStatsSortableHeader(t("games.statsTableColumns.threePa")),
      cell: ({ row }) => (
        <NumericCell value={row.original.threePointersAttempted} digits={0} />
      ),
    },
    {
      accessorKey: "freeThrowsMade",
      header: createStatsSortableHeader(t("games.statsTableColumns.ftm")),
      cell: ({ row }) => (
        <NumericCell value={row.original.freeThrowsMade} digits={0} />
      ),
    },
    {
      accessorKey: "freeThrowsAttempted",
      header: createStatsSortableHeader(t("games.statsTableColumns.fta")),
      cell: ({ row }) => (
        <NumericCell value={row.original.freeThrowsAttempted} digits={0} />
      ),
    },
  ];
}

export function createSeasonTeamStatsColumns(
  t: Translator,
): ColumnDef<SeasonTeamStatsRow>[] {
  return [
    createSearchColumn<SeasonTeamStatsRow>(["clubName", "clubNickname"]),
    {
      accessorKey: "clubName",
      header: createStatsSortableHeader(t("games.statsTableColumns.team")),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Avatar
            src={row.original.clubLogoUrl}
            initials={row.original.clubName.slice(0, 1).toUpperCase()}
            alt={row.original.clubName}
            className="size-5 bg-muted text-[9px] text-muted-foreground"
          />
          <span className="font-medium">{row.original.clubName}</span>
        </div>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "gamesPlayed",
      header: createStatsSortableHeader(t("games.statsTableColumns.gp")),
      cell: ({ row }) => (
        <NumericCell value={row.original.gamesPlayed} digits={0} />
      ),
    },
    {
      accessorKey: "wins",
      header: createStatsSortableHeader(t("games.statsTableColumns.w")),
      cell: ({ row }) => <NumericCell value={row.original.wins} digits={0} />,
    },
    {
      accessorKey: "losses",
      header: createStatsSortableHeader(t("games.statsTableColumns.l")),
      cell: ({ row }) => <NumericCell value={row.original.losses} digits={0} />,
    },
    {
      accessorKey: "winPct",
      header: createStatsSortableHeader(t("games.statsTableColumns.winPct")),
      cell: ({ row }) => <NumericCell value={row.original.winPct} suffix="%" />,
    },
    {
      accessorKey: "pointsForPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.pfpg")),
      cell: ({ row }) => <NumericCell value={row.original.pointsForPerGame} />,
    },
    {
      accessorKey: "pointsAllowedPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.papg")),
      cell: ({ row }) => (
        <NumericCell value={row.original.pointsAllowedPerGame} />
      ),
    },
    {
      accessorKey: "reboundsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.reb")),
      cell: ({ row }) => <NumericCell value={row.original.reboundsPerGame} />,
    },
    {
      accessorKey: "assistsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.ast")),
      cell: ({ row }) => <NumericCell value={row.original.assistsPerGame} />,
    },
    {
      accessorKey: "stealsPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.stl")),
      cell: ({ row }) => <NumericCell value={row.original.stealsPerGame} />,
    },
    {
      accessorKey: "blocksPerGame",
      header: createStatsSortableHeader(t("games.statsTableColumns.blk")),
      cell: ({ row }) => <NumericCell value={row.original.blocksPerGame} />,
    },
    {
      accessorKey: "fgPct",
      header: createStatsSortableHeader(t("games.statsTableColumns.fgPct")),
      cell: ({ row }) => <NumericCell value={row.original.fgPct} suffix="%" />,
    },
    {
      accessorKey: "threePct",
      header: createStatsSortableHeader(t("games.statsTableColumns.threePct")),
      cell: ({ row }) => (
        <NumericCell value={row.original.threePct} suffix="%" />
      ),
    },
    {
      accessorKey: "ftPct",
      header: createStatsSortableHeader(t("games.statsTableColumns.ftPct")),
      cell: ({ row }) => <NumericCell value={row.original.ftPct} suffix="%" />,
    },
    {
      accessorKey: "pointsFor",
      header: createStatsSortableHeader(
        t("games.statsTableColumns.pointsForTotal"),
      ),
      cell: ({ row }) => (
        <NumericCell value={row.original.pointsFor} digits={0} />
      ),
    },
    {
      accessorKey: "pointsAgainst",
      header: createStatsSortableHeader(
        t("games.statsTableColumns.pointsAgainstTotal"),
      ),
      cell: ({ row }) => (
        <NumericCell value={row.original.pointsAgainst} digits={0} />
      ),
    },
  ];
}

export function createSeasonPlayerStatsFilterConfigs(
  t: Translator,
  rows: SeasonPlayerStatsRow[],
): FilterConfig[] {
  const clubOptions = buildClubFilterOptions(rows);
  if (clubOptions.length === 0) {
    return [];
  }

  return [
    {
      id: "clubName",
      label: t("games.statsTableColumns.team"),
      options: clubOptions,
    },
  ];
}
