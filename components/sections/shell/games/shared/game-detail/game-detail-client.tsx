"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { GameHeader } from "./game-header";

interface GameDetailClientProps {
  preloadedGame: Preloaded<typeof api.games.getById>;
  orgSlug: string;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function GameDetailClient({
  preloadedGame,
  orgSlug,
}: GameDetailClientProps) {
  const t = useTranslations("Common");
  const game = usePreloadedQuery(preloadedGame);

  if (game === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  const score =
    typeof game.homeScore === "number" && typeof game.awayScore === "number"
      ? `${game.homeScore} - ${game.awayScore}`
      : "—";

  return (
    <div className="space-y-0">
      <GameHeader game={game} orgSlug={orgSlug} />

      <div className="grid gap-4 px-4 py-4 md:px-6 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("games.match")}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem label={t("games.homeTeam")} value={game.homeTeamName} />
            <DetailItem label={t("games.awayTeam")} value={game.awayTeamName} />
            <DetailItem label={t("games.score")} value={score} />
            <DetailItem label={t("games.date")} value={game.date} />
            <DetailItem label={t("games.startTime")} value={game.startTime} />
            <DetailItem
              label={t("games.status")}
              value={t(`games.statusOptions.${game.status}`)}
            />
          </div>
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("games.stats")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("games.statsComingSoon")}
          </p>
          <div className="mt-4 grid gap-3">
            <DetailItem label={t("games.category")} value={game.category} />
            <DetailItem label={t("games.gender")} value={t(`gender.${game.gender}`)} />
            <DetailItem
              label={t("games.location")}
              value={game.locationName?.trim() || "—"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
