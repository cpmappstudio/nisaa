"use client";

import { Fragment } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ROUTES, TEAM_ROUTES } from "@/lib/navigation/routes";
import type { TeamRouteScope } from "./types";

interface TeamHeaderProps {
  team: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    conferenceName?: string | null;
    divisionName?: string | null;
    status: string;
    nickname?: string | null;
    colors?: string[] | null;
    colorNames?: string[] | null;
  };
  orgSlug: string;
  routeScope: TeamRouteScope;
}

export function TeamHeader({ team, orgSlug, routeScope }: TeamHeaderProps) {
  const t = useTranslations("Common");
  const settingsHref =
    routeScope === "org"
      ? ROUTES.org.teams.settings(orgSlug, team.slug)
      : TEAM_ROUTES.settings.root(orgSlug, team.slug);

  const primaryColor = team.colors?.[0] ?? null;
  const hasColoredBg = !!primaryColor;

  // Isn't this redundant?
  const colorDisplay =
    team.colorNames && team.colorNames.length > 0
      ? team.colorNames.join(" & ").toUpperCase()
      : team.colors?.join(" & ").toUpperCase();

  const stats = [
    { label: t("teams.conference"), value: team.conferenceName },
    { label: t("teams.nickname"), value: team.nickname },
    {
      label: t("teams.colors"),
      value: colorDisplay,
    },
  ].filter((stat) => stat.value);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "affiliated":
        return "bg-green-500";
      case "invited":
        return "bg-yellow-500";
      case "suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden",
        hasColoredBg && "text-white",
      )}
      style={{
        backgroundColor: hasColoredBg ? primaryColor : undefined,
      }}
    >
      {team.logoUrl && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="relative size-full">
            <Image
              src={team.logoUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-contain object-center scale-[2.5] md:scale-[3] translate-x-[8%]"
              style={{ opacity: hasColoredBg ? 0.12 : 0.05 }}
            />
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto p-4 md:p-6 ">
        <div className="flex justify-between items-start">
          <div>
            {team.divisionName && (
              <Text
                className="text-xs uppercase tracking-wide "
                style={{
                  color: hasColoredBg ? "rgba(255,255,255,0.7)" : undefined,
                }}
              >
                {team.divisionName}
              </Text>
            )}
            <Heading
              level={1}
              className="flex items-center gap-2"
              style={{ color: hasColoredBg ? "white" : undefined }}
            >
              {team.name}

              <span
                className={cn(
                  "inline-block size-2.5 rounded-full",
                  getStatusColor(team.status),
                )}
                title={t(`teams.statusOptions.${team.status}`)}
              />
            </Heading>
          </div>
          <Button
            asChild
            className="rounded-full ring-1 bg-transparent hover:bg-transparent"
            size="sm"
          >
            <Link href={settingsHref}>
              <Settings className="size-4" />
              <span className="hidden md:block">{t("actions.settings")}</span>
            </Link>
          </Button>
        </div>

        {team.logoUrl && (
          <div className="flex justify-center ">
            <Image
              src={team.logoUrl}
              alt={team.name}
              width={180}
              height={0}
              className="object-contain select-none"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                msUserSelect: "none",
              }}
            />
          </div>
        )}

        {stats.length > 0 && (
          <div className="flex w-full items-center justify-between">
            {stats.map((stat, index) => (
              <Fragment key={stat.label}>
                {index > 0 && (
                  <Separator
                    orientation="vertical"
                    style={{
                      height: "48px",
                      backgroundColor: hasColoredBg
                        ? "rgba(255,255,255,0.3)"
                        : undefined,
                    }}
                  />
                )}
                <div className="flex-1 text-center">
                  <Text
                    className="uppercase tracking-widest"
                    style={{
                      fontSize: "10px",
                      color: hasColoredBg ? "rgba(255,255,255,0.6)" : undefined,
                    }}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    className="font-bold tracking-wide"
                    style={{
                      fontSize: "18px",
                      color: hasColoredBg ? "white" : undefined,
                    }}
                  >
                    {stat.value}
                  </Text>
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
