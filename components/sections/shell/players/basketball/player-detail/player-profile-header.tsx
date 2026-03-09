"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/navigation/routes";
import { getCountryLabel } from "@/lib/countries/countries";
import { getPlayerLastNames } from "@/lib/players/name";

interface PlayerProfileHeaderProps {
  player: {
    firstName: string;
    lastName: string;
    secondLastName?: string;
    photoUrl?: string;
    dateOfBirth?: string;
    jerseyNumber?: number;
    height?: number;
    weight?: number;
    country?: string;
    clubName: string;
    clubSlug: string;
    clubLogoUrl?: string;
    clubPrimaryColor?: string;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    gamesPlayed: number;
  };
  orgSlug: string;
  positionName?: string;
  statsBackgroundColor?: string | null;
  canEdit?: boolean;
  onEdit?: () => void;
}

function parseIsoDate(date?: string): Date | null {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatHeightDetailed(cm?: number): string {
  if (!cm) {
    return "—";
  }

  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  const meters = (cm / 100).toFixed(2);

  return `${feet}'${inches}\" (${meters}m)`;
}

function formatWeightDetailed(kg?: number): string {
  if (!kg) {
    return "—";
  }

  const lbs = Math.round(kg * 2.205);
  return `${lbs}lb (${kg}kg)`;
}

function formatBirthdate(date?: string): string {
  const parsed = parseIsoDate(date);
  if (!parsed) {
    return "—";
  }

  return format(parsed, "MMMM d, yyyy");
}

function calculateAgeFromBirthdate(date?: string): number | undefined {
  const birthDate = parseIsoDate(date);
  if (!birthDate) {
    return undefined;
  }

  const today = new Date();
  if (birthDate > today) {
    return undefined;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

function formatDecimal(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function StatsTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[58px] flex-col items-center justify-center px-2 py-2 text-center sm:min-h-[62px]">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-white/90 sm:text-[10px]">
        {label}
      </div>
      <div className="text-[24px] leading-none font-semibold text-white tabular-nums sm:text-[30px] lg:text-[34px]">
        {value}
      </div>
    </div>
  );
}

function DetailTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[50px] flex-col items-center justify-center px-2 py-2 text-center sm:min-h-[52px]",
        className,
      )}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wide text-white/90 sm:text-[10px]">
        {label}
      </div>
      <div className="text-[14px] leading-tight font-semibold text-white sm:text-[18px]">
        {value}
      </div>
    </div>
  );
}

export function PlayerProfileHeader({
  player,
  orgSlug,
  positionName,
  statsBackgroundColor,
  canEdit = false,
  onEdit,
}: PlayerProfileHeaderProps) {
  const t = useTranslations("Common");

  const firstName = player.firstName.trim().toUpperCase();
  const lastName = getPlayerLastNames(player).toUpperCase();
  const primaryColor = player.clubPrimaryColor ?? "#552583";
  const hasColoredBg = Boolean(player.clubPrimaryColor);

  const metaBits = [
    player.clubName,
    player.jerseyNumber !== undefined ? `#${player.jerseyNumber}` : undefined,
    positionName,
  ].filter(Boolean);

  const age = calculateAgeFromBirthdate(player.dateOfBirth);
  const birthdate = formatBirthdate(player.dateOfBirth);
  const height = formatHeightDetailed(player.height);
  const weight = formatWeightDetailed(player.weight);
  const country = getCountryLabel(player.country) ?? "—";
  const experience = player.gamesPlayed > 0 ? `${player.gamesPlayed} GP` : "—";

  const detailItems = [
    { label: t("players.height"), value: height },
    { label: t("players.weight"), value: weight },
    { label: t("playerCard.country"), value: country },
    { label: "Last Attended", value: "—" },
    {
      label: t("playerCard.age"),
      value: age !== undefined ? `${age} years` : "—",
    },
    { label: "Birthdate", value: birthdate },
    { label: "Draft", value: "—" },
    { label: "Experience", value: experience },
  ];

  return (
    <section
      className="relative w-full overflow-hidden text-white"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="relative h-[196px] sm:h-[230px] lg:h-[264px]">
        {player.clubLogoUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="relative size-full">
              <Image
                src={player.clubLogoUrl}
                alt=""
                fill
                sizes="100vw"
                className="object-contain object-center scale-[2.5] md:scale-[3] translate-x-[8%]"
                style={{ opacity: hasColoredBg ? 0.12 : 0.05 }}
              />
            </div>
          </div>
        )}

        {player.photoUrl ? (
          <div className="pointer-events-none absolute bottom-0 left-3 z-20 h-[172px] w-[172px] sm:left-8 sm:h-[182px] sm:w-[182px] lg:left-16 lg:h-[274px] lg:w-[274px]">
            <Image
              src={player.photoUrl}
              alt={`${player.firstName} ${getPlayerLastNames(player)}`}
              fill
              sizes="(max-width: 640px) 172px, (max-width: 1024px) 182px, 274px"
              className="object-contain object-bottom"
            />
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-1 left-6 z-20 flex size-[4.5rem] items-center justify-center rounded-full border border-white/25 bg-black/15 text-3xl font-black sm:size-24 lg:size-32">
            {firstName.charAt(0)}
            {lastName.charAt(0)}
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start justify-between px-4 pt-2 md:px-6 md:pt-6">
            {player.clubLogoUrl && (
              <Link
                href={ROUTES.org.teams.detail(orgSlug, player.clubSlug)}
                className="relative size-20 shrink-0 -translate-y-2 sm:size-24 sm:-translate-y-3 lg:size-28 lg:-translate-y-4"
              >
                <Image
                  src={player.clubLogoUrl}
                  alt={player.clubName}
                  fill
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, 112px"
                  className="object-contain"
                />
              </Link>
            )}

            {canEdit && (
              <Button
                type="button"
                onClick={onEdit}
                className="rounded-full ring-1 bg-transparent hover:bg-transparent"
                size="sm"
              >
                <Settings className="size-4" />
                <span className="hidden md:block">{t("actions.edit")}</span>
              </Button>
            )}
          </div>

          <div className="relative flex flex-1 items-end px-4 pb-0 md:px-6 lg:items-center">
            <div className="w-full -translate-y-10 pb-0 pl-[178px] pr-1 sm:-translate-y-2 sm:pb-1 sm:pl-[210px] sm:pr-2 lg:-translate-y-12 lg:pl-[392px] lg:pr-10">
              <p className="max-w-full truncate text-[10px] font-semibold leading-tight text-white/92 sm:text-[11px] lg:text-[12px]">
                {metaBits.join(" | ")}
              </p>
              <h1 className="mt-0.5 text-[30px] font-black uppercase leading-[0.92] tracking-tight sm:text-[38px] lg:text-[58px]">
                <span className="block">{firstName}</span>
                <span className="block">{lastName}</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative z-30 border border-white/40"
        style={{
          backgroundColor: statsBackgroundColor ?? "rgba(0, 0, 0, 0.14)",
        }}
      >
        <div className="lg:hidden">
          <div className="flex items-center justify-center divide-x divide-white/35 border-b border-white/40">
            <div className="w-1/3">
              <StatsTile
                label="PPG"
                value={formatDecimal(player.pointsPerGame)}
              />
            </div>
            <div className="w-1/3">
              <StatsTile
                label="RPG"
                value={formatDecimal(player.reboundsPerGame)}
              />
            </div>
            <div className="w-1/3">
              <StatsTile
                label="APG"
                value={formatDecimal(player.assistsPerGame)}
              />
            </div>
          </div>

          <div className="hidden sm:grid sm:grid-cols-4 sm:divide-x sm:divide-white/35 sm:[&>*:nth-child(-n+4)]:border-b sm:[&>*:nth-child(-n+4)]:border-white/40">
            {detailItems.map((item) => (
              <DetailTile
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 divide-x divide-white/35 text-center sm:hidden">
            <div className="border-b border-white/40 px-3 py-3 text-[13px] font-semibold sm:text-sm">
              {`${height} | ${weight} | ${
                age !== undefined ? `${age} years` : "—"
              }`}
            </div>
            <DetailTile
              label="Draft"
              value="—"
              className="border-b border-white/40"
            />
            <DetailTile
              label="Birthdate"
              value={birthdate}
              className="border-b border-white/40"
            />
            <DetailTile
              label={t("playerCard.country")}
              value={country}
              className="border-b border-white/40"
            />
            <DetailTile label="Last Attended" value="—" />
            <DetailTile label="Experience" value={experience} />
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-12 lg:divide-x lg:divide-white/35">
          <div className="col-span-5 grid grid-cols-3 divide-x divide-white/35">
            <StatsTile
              label="PPG"
              value={formatDecimal(player.pointsPerGame)}
            />
            <StatsTile
              label="RPG"
              value={formatDecimal(player.reboundsPerGame)}
            />
            <StatsTile
              label="APG"
              value={formatDecimal(player.assistsPerGame)}
            />
          </div>

          <div className="col-span-7 grid grid-cols-4 divide-x divide-white/35 [&>*:nth-child(-n+4)]:border-b [&>*:nth-child(-n+4)]:border-white/40">
            {detailItems.map((item) => (
              <DetailTile
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
