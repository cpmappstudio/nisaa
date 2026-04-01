"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/lib/navigation/routes";
import { TeamGeneralForm } from "./team-general-form";
import { TeamPlayersTable } from "./team-players-table";
import { TeamStaffClient } from "@/components/sections/shell/teams/team-staff-client";

interface TeamSettingsClientProps {
  preloadedTeam: Preloaded<typeof api.clubs.getBySlug>;
  preloadedPlayers: Preloaded<
    typeof api.players.listBasketballPlayersByClubSlug
  >;
  preloadedStaff: Preloaded<typeof api.staff.listAllByClubSlug>;
  orgSlug: string;
  clubSlug: string;
}

export function TeamSettingsClient({
  preloadedTeam,
  preloadedPlayers,
  preloadedStaff,
  orgSlug,
  clubSlug,
}: TeamSettingsClientProps) {
  const t = useTranslations("Common");
  const team = usePreloadedQuery(preloadedTeam);
  const playersData = usePreloadedQuery(preloadedPlayers);

  if (team === null) {
    return (
      <div className="p-4 md:p-6">
        <Heading>{t("errors.notFound")}</Heading>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={ROUTES.org.teams.detail(orgSlug, team.slug)}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <Heading level={2}>{team.name}</Heading>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <div className="w-full overflow-x-auto overflow-y-hidden">
          <TabsList className="inline-flex min-w-max flex-nowrap pb-2.5">
            <TabsTrigger value="general" className="flex-none shrink-0">
              {t("settings.general")}
            </TabsTrigger>
            <TabsTrigger value="players" className="flex-none shrink-0">
              {t("players.title")}
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex-none shrink-0">
              {t("staff.title")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-6">
          <TeamGeneralForm team={team} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <TeamPlayersTable
            players={playersData ?? []}
            clubSlug={team.slug}
            orgSlug={orgSlug}
            routeScope="org"
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <TeamStaffClient
            preloadedStaff={preloadedStaff}
            clubSlug={clubSlug}
            orgSlug={orgSlug}
            withPadding={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
