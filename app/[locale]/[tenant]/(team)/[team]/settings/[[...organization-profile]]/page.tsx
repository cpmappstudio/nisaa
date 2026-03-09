"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { TeamGeneralForm } from "@/components/sections/shell/teams/shared/team-general-form";
import SettingsItem from "@/components/sections/shell/settings/settings-item";

export default function TeamSettingsPage({
  params,
}: {
  params: Promise<{ tenant: string; team: string }>;
}) {
  const { tenant, team: teamSlug } = use(params);
  const t = useTranslations("Settings.general.organization");
  const team = useQuery(api.clubs.getBySlug, { slug: teamSlug });

  if (!team) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <SettingsItem title={t("title")} description={t("description")}>
        <TeamGeneralForm team={team} orgSlug={tenant} />
      </SettingsItem>
    </div>
  );
}
