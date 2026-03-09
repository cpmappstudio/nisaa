"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ROUTES } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import type { GameRow } from "@/components/sections/shell/games/shared/columns";

interface TeamsGamesWeekStripProps {
  games: GameRow[];
  orgSlug: string;
}

const PAST_STATUSES = new Set<GameRow["status"]>([
  "completed",
  "cancelled",
  "awaiting_stats",
  "pending_review",
]);

type GameWithMeta = {
  game: GameRow;
  dateTime: Date;
  isPast: boolean;
};

type TimelineItem =
  | {
      kind: "day";
      date: string;
    }
  | {
      kind: "game";
      value: GameWithMeta;
    };

function parseGameDateTime(date: string, startTime: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours = 0, minutes = 0] = startTime.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0);
}

function isPastGame(game: GameRow, dateTime: Date, nowMs: number) {
  return PAST_STATUSES.has(game.status) || dateTime.getTime() < nowMs;
}

function TeamRow({
  name,
  logoUrl,
  score,
  showScore,
}: {
  name: string;
  logoUrl?: string;
  score?: number;
  showScore: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar
          src={logoUrl}
          initials={name.charAt(0).toUpperCase()}
          alt={name}
          className="size-5 bg-muted text-muted-foreground"
        />
        <span className="truncate text-sm font-medium">{name}</span>
      </div>
      <span className="text-xl/none font-bold tabular-nums">
        {showScore && typeof score === "number" ? score : "—"}
      </span>
    </div>
  );
}

export function TeamsGamesWeekStrip({
  games,
  orgSlug,
}: TeamsGamesWeekStripProps) {
  const locale = useLocale();
  const stripRef = React.useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = React.useRef(false);

  const formatters = React.useMemo(
    () => ({
      day: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      month: new Intl.DateTimeFormat(locale, { month: "short" }),
      time: new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      }),
    }),
    [locale],
  );

  const gamesWithMeta = React.useMemo(() => {
    const nowMs = Date.now();
    return games
      .map((game) => {
        const dateTime = parseGameDateTime(game.date, game.startTime);
        return {
          game,
          dateTime,
          isPast: isPastGame(game, dateTime, nowMs),
        };
      })
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [games]);

  const initialFocusGameId = React.useMemo(() => {
    const firstUpcoming = gamesWithMeta.find((item) => !item.isPast);
    if (firstUpcoming) {
      return firstUpcoming.game._id;
    }
    return gamesWithMeta.at(-1)?.game._id ?? null;
  }, [gamesWithMeta]);

  const timelineItems = React.useMemo(() => {
    const items: TimelineItem[] = [];
    let lastDate: string | null = null;

    for (const item of gamesWithMeta) {
      if (item.game.date !== lastDate) {
        items.push({ kind: "day", date: item.game.date });
        lastDate = item.game.date;
      }
      items.push({ kind: "game", value: item });
    }

    return items;
  }, [gamesWithMeta]);

  React.useEffect(() => {
    if (!initialFocusGameId || hasAutoScrolledRef.current) {
      return;
    }

    const container = stripRef.current;
    if (!container) {
      return;
    }

    const escapedGameId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(initialFocusGameId)
        : initialFocusGameId;
    const target = container.querySelector<HTMLElement>(
      `[data-game-id="${escapedGameId}"]`,
    );
    if (!target) {
      return;
    }

    const left =
      target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, left),
      behavior: "smooth",
    });
    hasAutoScrolledRef.current = true;
  }, [initialFocusGameId, timelineItems.length]);

  React.useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [games.length]);

  const scrollStrip = (direction: "left" | "right") => {
    const container = stripRef.current;
    if (!container) {
      return;
    }
    container.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  };

  if (timelineItems.length === 0) {
    return null;
  }

  return (
    <section className="group relative rounded-md bg-muted/25 py-2">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 bg-background/95 opacity-0 transition-opacity duration-200 pointer-events-none md:inline-flex md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:hover:opacity-100 md:focus-visible:opacity-100"
        onClick={() => scrollStrip("left")}
      >
        <ChevronLeftIcon className="size-4" />
        <span className="sr-only">Scroll left</span>
      </Button>

      <div
        ref={stripRef}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max items-stretch gap-2">
          {timelineItems.map((item) => {
            if (item.kind === "day") {
              const dayDate = parseDateOnly(item.date);
              return (
                <div
                  key={`day-${item.date}`}
                  className="flex w-14 shrink-0 snap-start flex-col items-center justify-center rounded-sm bg-secondary px-1 py-2 text-center"
                >
                  <span className="text-[11px] font-bold uppercase leading-none">
                    {formatters.day.format(dayDate)}
                  </span>
                  <span className="mt-1 text-[10px] uppercase text-muted-foreground leading-none">
                    {formatters.month.format(dayDate)}
                  </span>
                  <span className="mt-1 text-lg font-black leading-none">
                    {dayDate.getDate()}
                  </span>
                </div>
              );
            }

            const { game, dateTime, isPast } = item.value;
            const headerLabel = `${game.category} · ${formatters.time.format(dateTime)}`;
            const showScore =
              isPast &&
              typeof game.homeScore === "number" &&
              typeof game.awayScore === "number";

            return (
              <Link
                key={game._id}
                href={ROUTES.org.games.detail(orgSlug, game._id)}
                data-game-id={game._id}
                className={cn(
                  "w-[190px] shrink-0 snap-start rounded-sm border border-border bg-card px-3 py-2 transition-colors hover:bg-accent/40",
                  !isPast && "border-primary/40 bg-primary/5",
                )}
              >
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide">
                  {headerLabel}
                </p>

                <div className="space-y-1.5">
                  <TeamRow
                    name={game.homeTeamName}
                    logoUrl={game.homeTeamLogo}
                    score={game.homeScore}
                    showScore={showScore}
                  />
                  <TeamRow
                    name={game.awayTeamName}
                    logoUrl={game.awayTeamLogo}
                    score={game.awayScore}
                    showScore={showScore}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 bg-background/95 opacity-0 transition-opacity duration-200 pointer-events-none md:inline-flex md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:hover:opacity-100 md:focus-visible:opacity-100"
        onClick={() => scrollStrip("right")}
      >
        <ChevronRightIcon className="size-4" />
        <span className="sr-only">Scroll right</span>
      </Button>
    </section>
  );
}
