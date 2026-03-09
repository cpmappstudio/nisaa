"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getPlayerFullName,
  getPlayerInitials,
  getPlayerLastNames,
} from "@/lib/players/name";

interface PlayerCardProps {
  player: {
    firstName: string;
    lastName: string;
    secondLastName?: string;
    photoUrl?: string;
    dateOfBirth?: string;
    jerseyNumber?: number;
    position?: string;
    height?: number;
    weight?: number;
  };
  positionLabel?: string;
  className?: string;
  onClick?: () => void;
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

function calculateAge(date?: string): number | undefined {
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

function formatHeight(cm?: number): string {
  if (!cm) {
    return "—";
  }

  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  return `${feet}'${inches}"`;
}

function formatWeight(kg?: number): string {
  if (!kg) {
    return "—";
  }

  const lbs = Math.round(kg * 2.205);
  return `${lbs}lb`;
}

export function PlayerCard({
  player,
  positionLabel,
  className,
  onClick,
}: PlayerCardProps) {
  const t = useTranslations("Common");

  const fullName = getPlayerFullName(player);
  const displayLastNames = getPlayerLastNames(player);
  const age = player.dateOfBirth ? calculateAge(player.dateOfBirth) : undefined;

  const props = [
    player.height !== undefined && {
      label: t("playerCard.height"),
      value: formatHeight(player.height),
    },
    player.weight !== undefined && {
      label: t("playerCard.weight"),
      value: formatWeight(player.weight),
    },
    age !== undefined && { label: t("playerCard.age"), value: age },
  ].filter(Boolean) as { label: string; value: string | number }[];

  return (
    <Card
      className={cn(
        "overflow-hidden py-4 relative",
        onClick && "cursor-pointer transition-colors hover:bg-accent/40",
        className,
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {player.photoUrl && (
        <Image
          src={player.photoUrl}
          alt={fullName}
          width={290}
          height={0}
          className="absolute bottom-0"
          style={{ left: "40%" }}
        />
      )}

      <div className="grid grid-cols-2">
        <div className="p-4 flex flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground font-medium">
                {player.firstName}
              </p>
              <h3 className="font-bold leading-tight">{displayLastNames}</h3>
              {positionLabel && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                  {positionLabel}
                </p>
              )}
            </div>
            {player.jerseyNumber !== undefined && (
              <span className="shrink-0 text-[2.1rem] leading-[2.1rem] font-black text-foreground/25 tabular-nums select-none">
                {player.jerseyNumber}
              </span>
            )}
          </div>

          <div className="mt-auto">
            {props.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center justify-between py-1",
                  index < props.length - 1 && "border-b",
                )}
              >
                <span
                  className="font-medium text-muted-foreground uppercase tracking-wide"
                  style={{ fontSize: "0.7rem", lineHeight: "1rem" }}
                >
                  {item.label}
                </span>
                <span
                  className="text-foreground font-medium"
                  style={{ fontSize: "0.7rem" }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="">
          {!player.photoUrl && (
            <div className="h-24 w-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/30">
                {getPlayerInitials(player)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PlayerCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden py-0 relative", className)}>
      <div className="grid grid-cols-2 animate-pulse">
        <div className="p-4 flex flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-6 w-24 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-8 w-10 bg-muted rounded" />
          </div>

          <div className="mt-auto">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex justify-between py-1",
                  i < 4 && "border-b border-border/50",
                )}
              >
                <div className="h-3 w-14 bg-muted rounded" />
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted h-24" />
      </div>
    </Card>
  );
}
