"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { createSearchColumn } from "@/components/table/column-helpers";
import { createStatsSortableHeader } from "@/components/sections/shell/stats/basketball/stats-columns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Translator = (key: string) => string;

export interface PlayerGameLogRow {
  gameId: string;
  date: string;
  startTime: string;
  gameType: "quick" | "season";
  teamName: string;
  teamNickname?: string;
  opponentName: string;
  opponentNickname?: string;
  result: "W" | "L" | "—";
  teamScore?: number;
  opponentScore?: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  plusMinus: number;
}

function formatDateOnly(date: string, locale: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(new Date(year, month - 1, day));
}

function formatScore(teamScore?: number, opponentScore?: number): string {
  if (typeof teamScore === "number" && typeof opponentScore === "number") {
    return `${teamScore}-${opponentScore}`;
  }
  return "—";
}

function NumericCell({ value }: { value: number }) {
  return <span className="tabular-nums">{value}</span>;
}

export function createPlayerGameLogColumns(
  t: Translator,
  locale: string,
): ColumnDef<PlayerGameLogRow>[] {
  return [
    createSearchColumn<PlayerGameLogRow>([
      "date",
      "teamName",
      "teamNickname",
      "opponentName",
      "opponentNickname",
      "gameType",
    ]),
    {
      accessorKey: "date",
      header: createStatsSortableHeader(t("games.date")),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDateOnly(row.original.date, locale)}
        </span>
      ),
    },
    {
      accessorKey: "teamName",
      header: createStatsSortableHeader(t("games.statsTableColumns.team")),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.teamNickname?.trim()
            ? row.original.teamNickname.toUpperCase()
            : row.original.teamName}
        </span>
      ),
    },
    {
      accessorKey: "opponentName",
      header: createStatsSortableHeader(t("games.opponent")),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.opponentNickname?.trim()
            ? row.original.opponentNickname.toUpperCase()
            : row.original.opponentName}
        </span>
      ),
    },
    {
      accessorKey: "gameType",
      header: createStatsSortableHeader(t("games.type")),
      cell: ({ row }) => t(`games.typeOptions.${row.original.gameType}`),
    },
    {
      accessorKey: "result",
      header: createStatsSortableHeader("W/L"),
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex min-w-8 items-center justify-center rounded-sm px-1 py-0.5 text-xs font-semibold",
            row.original.result === "W" &&
              "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
            row.original.result === "L" &&
              "bg-red-500/20 text-red-700 dark:text-red-300",
            row.original.result === "—" && "text-muted-foreground",
          )}
        >
          {row.original.result}
        </span>
      ),
    },
    {
      accessorKey: "score",
      header: createStatsSortableHeader(t("games.score")),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatScore(row.original.teamScore, row.original.opponentScore)}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a =
          typeof rowA.original.teamScore === "number" &&
          typeof rowA.original.opponentScore === "number"
            ? rowA.original.teamScore - rowA.original.opponentScore
            : Number.NEGATIVE_INFINITY;
        const b =
          typeof rowB.original.teamScore === "number" &&
          typeof rowB.original.opponentScore === "number"
            ? rowB.original.teamScore - rowB.original.opponentScore
            : Number.NEGATIVE_INFINITY;
        return a - b;
      },
    },
    {
      accessorKey: "points",
      header: createStatsSortableHeader("PTS"),
      cell: ({ row }) => <NumericCell value={row.original.points} />,
    },
    {
      accessorKey: "rebounds",
      header: createStatsSortableHeader("REB"),
      cell: ({ row }) => <NumericCell value={row.original.rebounds} />,
    },
    {
      accessorKey: "assists",
      header: createStatsSortableHeader("AST"),
      cell: ({ row }) => <NumericCell value={row.original.assists} />,
    },
    {
      accessorKey: "steals",
      header: createStatsSortableHeader("STL"),
      cell: ({ row }) => <NumericCell value={row.original.steals} />,
    },
    {
      accessorKey: "blocks",
      header: createStatsSortableHeader("BLK"),
      cell: ({ row }) => <NumericCell value={row.original.blocks} />,
    },
    {
      accessorKey: "minutes",
      header: createStatsSortableHeader(t("games.statsTableColumns.min")),
      cell: ({ row }) => <NumericCell value={row.original.minutes} />,
    },
  ];
}

interface PlayerRecentStatsPreviewProps {
  rows: PlayerGameLogRow[];
  isLoading: boolean;
  className?: string;
}

export function PlayerRecentStatsPreview({
  rows,
  isLoading,
  className,
}: PlayerRecentStatsPreviewProps) {
  const t = useTranslations("Common");
  const locale = useLocale();

  return (
    <section className={cn("rounded-md border bg-card p-4", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("players.recentStatsTitle")}
      </h2>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("actions.loading")}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("players.recentStatsEmpty")}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("games.date")}</TableHead>
                <TableHead>{t("games.statsTableColumns.team")}</TableHead>
                <TableHead>{t("games.opponent")}</TableHead>
                <TableHead className="text-right">PTS</TableHead>
                <TableHead className="text-right">REB</TableHead>
                <TableHead className="text-right">AST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 5).map((row) => (
                <TableRow key={row.gameId}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDateOnly(row.date, locale)}
                  </TableCell>
                  <TableCell className="max-w-[90px] truncate font-medium">
                    {row.teamNickname?.trim()
                      ? row.teamNickname.toUpperCase()
                      : row.teamName}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate font-medium">
                    {row.opponentNickname?.trim()
                      ? row.opponentNickname.toUpperCase()
                      : row.opponentName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.points}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.rebounds}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.assists}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
