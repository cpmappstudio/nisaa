"use client";

import * as React from "react";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PlusIcon,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlayerHighlight {
  id: string;
  title: string;
  url: string;
  videoId: string;
}

interface PlayerHighlightsStripProps {
  highlights: PlayerHighlight[];
  canManage: boolean;
  onAdd: () => void;
  onEditHighlight?: (highlight: PlayerHighlight) => void;
  className?: string;
}

export function PlayerHighlightsStrip({
  highlights,
  canManage,
  onAdd,
  onEditHighlight,
  className,
}: PlayerHighlightsStripProps) {
  const t = useTranslations("Common");
  const stripRef = React.useRef<HTMLDivElement>(null);

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

  if (highlights.length === 0 && !canManage) {
    return null;
  }

  return (
    <section
      className={cn(
        "group relative rounded-md border bg-muted/25 p-2",
        className,
      )}
    >
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
          {canManage && (
            <button
              type="button"
              onClick={onAdd}
              className="flex w-[190px] shrink-0 snap-start flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card px-3 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="mb-2 flex size-8 items-center justify-center rounded-full border">
                <PlusIcon className="size-4" />
              </div>
              <p className="text-sm font-semibold">
                {t("players.addHighlight")}
              </p>
            </button>
          )}

          {highlights.map((highlight) => (
            <article
              key={highlight.id}
              className="group/card relative w-[190px] shrink-0 snap-start overflow-hidden rounded-sm border border-border bg-card transition-colors hover:bg-accent/40"
            >
              <a href={highlight.url} target="_blank" rel="noreferrer">
                <div className="relative h-[104px] bg-muted">
                  <Image
                    src={`https://i.ytimg.com/vi/${highlight.videoId}/hqdefault.jpg`}
                    alt={highlight.title}
                    fill
                    sizes="190px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                    <span className="flex size-8 items-center justify-center rounded-full bg-black/60 text-white">
                      <PlayIcon className="size-4 fill-current" />
                    </span>
                  </div>
                </div>
                <p className="truncate px-3 py-2 text-sm font-semibold">
                  {highlight.title}
                </p>
              </a>

              {canManage && onEditHighlight && (
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={() => onEditHighlight(highlight)}
                  className="absolute right-2 top-2 rounded-full ring-1 bg-transparent text-white hover:bg-transparent opacity-100 md:opacity-0 md:group-hover/card:opacity-100"
                >
                  <Settings className="size-4" />
                  <span className="sr-only">{t("actions.edit")}</span>
                </Button>
              )}
            </article>
          ))}
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
