"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TeamCategoriesTable } from "./team-categories-table";

interface TeamCategoriesClientProps {
  preloadedCategories: Preloaded<
    typeof api.categories.listByClubSlugWithPlayerCount
  >;
  clubSlug: string;
  orgSlug: string;
}

export function TeamCategoriesClient({
  preloadedCategories,
  clubSlug,
  orgSlug,
}: TeamCategoriesClientProps) {
  const categories = usePreloadedQuery(preloadedCategories);

  return (
    <div className="p-4 md:p-6 ">
      <TeamCategoriesTable
        categories={categories}
        clubSlug={clubSlug}
        orgSlug={orgSlug}
      />
    </div>
  );
}
